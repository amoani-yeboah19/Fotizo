import { api } from "@/api";

export type PushState =
  /** This browser can't receive web push (or the site isn't set up for it). */
  | "unsupported"
  /** The person blocked notifications for Fotizo in their browser settings. */
  | "blocked"
  | "off"
  | "on";

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** VAPID public key (base64url) -> the byte form PushManager expects. */
function keyBytes(base64url: string) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const registration = () => navigator.serviceWorker.register("/sw.js");

export async function pushState(): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const existing = await (await navigator.serviceWorker.getRegistration("/sw.js"))?.pushManager.getSubscription();
  return existing && Notification.permission === "granted" ? "on" : "off";
}

/** Asks permission, subscribes this browser and saves it to the signed-in account. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return "unsupported";
  const { publicKey } = await api.get<{ publicKey: string | null }>("/push/key");
  if (!publicKey) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api.post("/push/subscriptions", subscription.toJSON());
  return "on";
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return "unsupported";
  const subscription = await (await navigator.serviceWorker.getRegistration("/sw.js"))?.pushManager.getSubscription();
  if (subscription) {
    await api.del("/push/subscriptions", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
  return "off";
}

/**
 * Keeps an existing subscription attached to whoever is signed in now, so a
 * shared device alerts the right account. Safe to call on every visit.
 */
export async function syncPushSubscription() {
  if (!supported() || Notification.permission !== "granted") return;
  const subscription = await (await navigator.serviceWorker.getRegistration("/sw.js"))?.pushManager.getSubscription();
  if (subscription) await api.post("/push/subscriptions", subscription.toJSON());
}
