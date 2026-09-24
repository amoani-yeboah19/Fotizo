import { expect, it, vi } from "vitest";
vi.mock("@workspace/db", () => ({ pool: { query: vi.fn() } }));
import { pool } from "@workspace/db";
import { probeReadiness } from "./readiness";
it("shares concurrent probes and retries after a failed database check", async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(pool.query).mockImplementationOnce(
    () =>
      new Promise((_resolve, no) => {
        reject = no;
      }) as never,
  );
  const first = probeReadiness();
  const second = probeReadiness();
  expect(first).toBe(second);
  const rejection = expect(first).rejects.toThrow("offline");
  reject(new Error("offline"));
  await rejection;
  vi.mocked(pool.query).mockImplementationOnce(
    async () => ({ rows: [] }) as never,
  );
  await expect(probeReadiness()).resolves.toBeUndefined();
  expect(pool.query).toHaveBeenCalledTimes(2);
});
