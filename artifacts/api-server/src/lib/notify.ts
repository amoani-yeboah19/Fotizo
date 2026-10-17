import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { configuredOrigins } from "../middlewares/security";
import { logger } from "./logger";

// Settings are read when used, so a deploy picks up new keys on restart and
// tests can set them per case.
const env = {
  vapidPublic: () => process.env.VAPID_PUBLIC_KEY?.trim() ?? "",
  vapidPrivate: () => process.env.VAPID_PRIVATE_KEY?.trim() ?? "",
  vapidSubject: () => process.env.VAPID_SUBJECT?.trim() || "mailto:support@fotizo.app",
  emailKey: () => process.env.RESEND_API_KEY?.trim() ?? "",
  emailFrom: () => process.env.EMAIL_FROM?.trim() ?? "",
  emailApi: () => process.env.EMAIL_API_URL?.trim() || "https://api.resend.com/emails",
  appUrl: () => (process.env.APP_URL ?? configuredOrigins()[0] ?? "").replace(/\/+$/, ""),
};

export const pushConfigured = () => Boolean(env.vapidPublic() && env.vapidPrivate());
export const emailConfigured = () => Boolean(env.emailKey() && env.emailFrom());
/** The key browsers need to subscribe, or null when push is not set up. */
export const pushPublicKey = () => (pushConfigured() ? env.vapidPublic() : null);

export type Notice = {
  title: string;
  body: string;
  /** Path on the site the notification opens, e.g. /dashboard/seller?tab=orders. */
  path: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendPush(userIds: string[], notice: Notice): Promise<number> {
  if (!pushConfigured() || !userIds.length) return 0;
  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.userId, userIds));
  const payload = JSON.stringify({ title: notice.title, body: notice.body, url: notice.path });
  const options = {
    vapidDetails: { subject: env.vapidSubject(), publicKey: env.vapidPublic(), privateKey: env.vapidPrivate() },
    TTL: 24 * 60 * 60,
    urgency: "high" as const,
    timeout: 10_000,
  };
  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, options),
    ),
  );
  let sent = 0;
  await Promise.all(
    results.map(async (result, i) => {
      if (result.status === "fulfilled") return void sent++;
      const status = (result.reason as { statusCode?: number })?.statusCode;
      // The browser unsubscribed or the subscription expired: forget it.
      if (status === 404 || status === 410)
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, subscriptions[i].id));
      else logger.warn({ status }, "Push notification failed");
    }),
  );
  return sent;
}

async function sendEmail(userIds: string[], notice: Notice): Promise<number> {
  if (!emailConfigured() || !userIds.length) return 0;
  const recipients = await db
    .select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));
  const link = `${env.appUrl()}${notice.path}`;
  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const response = await fetch(env.emailApi(), {
        method: "POST",
        headers: { Authorization: `Bearer ${env.emailKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.emailFrom(),
          to: [r.email],
          subject: notice.title,
          text: `${notice.body}\n\nOpen Fotizo: ${link}`,
          html: `<p>${escapeHtml(notice.body)}</p><p><a href="${escapeHtml(link)}">Open Fotizo</a></p>`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`email rejected (${response.status})`);
    }),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) logger.warn({ failed: failed.length }, "Some notification emails failed");
  return results.length - failed.length;
}

/**
 * Sends a notice to each user's notification devices and inbox. Missing push
 * or email settings skip that channel; failures are logged, never thrown.
 */
export async function notifyUsers(userIds: string[], notice: Notice) {
  const unique = [...new Set(userIds)];
  const [push, email] = await Promise.allSettled([sendPush(unique, notice), sendEmail(unique, notice)]);
  const count = (r: PromiseSettledResult<number>) => {
    if (r.status === "fulfilled") return r.value;
    logger.warn({ errorType: (r.reason as Error)?.name }, "Notification channel failed");
    return 0;
  };
  return { pushSent: count(push), emailSent: count(email) };
}
