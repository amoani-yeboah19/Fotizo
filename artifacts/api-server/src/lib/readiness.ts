import { pool } from "@workspace/db";

export const runtimeState = { draining: false };

/** Checks connectivity and the security/catalogue schema required by this release. */
export async function checkDatabaseReadiness(): Promise<void> {
  // A timed-out pool query discards the connection. Acquisition is separately
  // bounded by the pool's five-second connection timeout.
  // pg supports per-query timeouts; its QueryConfig typings omit this option.
  const query = {
    text: `SELECT u.suspended_at, p.channel, s.expires_at, a.expires_at
      FROM users u CROSS JOIN products p CROSS JOIN sessions s CROSS JOIN auth_rate_limits a LIMIT 0`,
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
