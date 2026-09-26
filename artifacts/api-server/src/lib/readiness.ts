import { pool } from "@workspace/db";

export const runtimeState = { draining: false };

/** Checks connectivity and the security/catalogue schema required by this release. */
export async function checkDatabaseReadiness(): Promise<void> {
  // A timed-out pool query discards the connection. Acquisition is separately
  // bounded by the pool's five-second connection timeout.
  // pg supports per-query timeouts; its QueryConfig typings omit this option.
  const query = {
    text: `SELECT u.suspended_at, u.account_status_version, p.channel, s.expires_at, a.expires_at, audit.status_version,
        sr.status_version, v.slug, ve.status_version, ce.status_version, w.created_at, b.status_version, o.payment_status, ci.quantity, pa.status, pe.event_id, ap.version, pac.policy_version, u.onboarding_completed_at, aa.target_type, lr.version, d.version, p.moderation_hold, sv.moderation_hold, mu.path
      FROM users u CROSS JOIN products p CROSS JOIN sessions s CROSS JOIN auth_rate_limits a CROSS JOIN account_audit audit
        CROSS JOIN support_requests sr CROSS JOIN vehicles v CROSS JOIN vehicle_enquiries ve CROSS JOIN case_events ce CROSS JOIN wishlist_items w CROSS JOIN bookings b CROSS JOIN orders o CROSS JOIN cart_items ci CROSS JOIN payment_attempts pa CROSS JOIN payment_events pe CROSS JOIN account_profiles ap CROSS JOIN policy_acceptances pac CROSS JOIN admin_audit aa CROSS JOIN listing_reviews lr CROSS JOIN disputes d CROSS JOIN services sv CROSS JOIN media_uploads mu LIMIT 0`,
    query_timeout: 2000,
  };
  await pool.query(query);
}

// Share a probe while it is in flight; simultaneous health polling cannot fill the pool.
let pending: Promise<void> | undefined;
export function probeReadiness(): Promise<void> {
  if (!pending)
    pending = checkDatabaseReadiness().finally(() => {
      pending = undefined;
    });
  return pending;
}
