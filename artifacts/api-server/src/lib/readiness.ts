import { pool } from "@workspace/db";

export const runtimeState = { draining: false };

/** Checks connectivity and the security/catalogue schema required by this release. */
export async function checkDatabaseReadiness(): Promise<void> {
  // A timed-out pool query discards the connection. Acquisition is separately
  // bounded by the pool's five-second connection timeout.
  // pg supports per-query timeouts; its QueryConfig typings omit this option.
  const query = {
    text: `SELECT u.suspended_at, u.account_status_version, p.channel, s.expires_at, a.expires_at, audit.status_version,
        sr.status_version, v.slug, ve.status_version, ce.status_version, w.created_at
      FROM users u CROSS JOIN products p CROSS JOIN sessions s CROSS JOIN auth_rate_limits a CROSS JOIN account_audit audit
        CROSS JOIN support_requests sr CROSS JOIN vehicles v CROSS JOIN vehicle_enquiries ve CROSS JOIN case_events ce CROSS JOIN wishlist_items w LIMIT 0`,
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
