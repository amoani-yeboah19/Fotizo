import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { createShutdown, parsePort } from "./lifecycle";

afterEach(() => vi.useRealTimers());
it("validates the TCP port before listening", () => {
  for (const port of [
    undefined,
    "",
    "0",
    "-1",
    "1.5",
    "65536",
    "Infinity",
    "NaN",
  ])
    expect(() => parsePort(port)).toThrow();
  expect(parsePort("5000")).toBe(5000);
});
it("lets an active HTTP request finish before closing the database", async () => {
  let finishResponse!: () => void;
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const server = createServer((_req, res) => {
    finishResponse = () => res.end("finished");
    started();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const response = fetch(
    `http://127.0.0.1:${(server.address() as { port: number }).port}`,
  );
  await requestStarted;
  const markDraining = vi.fn();
  const closeDatabase = vi.fn().mockResolvedValue(undefined);
  const exit = vi.fn();
  const shutdown = createShutdown(server, {
    markDraining,
    closeDatabase,
    exit,
  });
  const first = shutdown();
  expect(shutdown()).toBe(first);
  expect(markDraining).toHaveBeenCalledTimes(1);
  expect(closeDatabase).not.toHaveBeenCalled();
  finishResponse();
  expect(await (await response).text()).toBe("finished");
  await first;
  expect(closeDatabase).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledExactlyOnceWith(0);
});
it("forces shutdown at the deadline and never exits twice", async () => {
  vi.useFakeTimers();
  let closed!: (error?: Error) => void;
  const server = {
    close: vi.fn((callback) => {
      closed = callback;
    }),
    closeAllConnections: vi.fn(),
  };
  const exit = vi.fn();
  const closeDatabase = vi.fn().mockResolvedValue(undefined);
  const shutdown = createShutdown(server as unknown as Server, {
    markDraining: vi.fn(),
    closeDatabase,
    exit,
    timeoutMs: 100,
  });
  const result = shutdown();
  await vi.advanceTimersByTimeAsync(100);
  await result;
  expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  closed();
  await Promise.resolve();
  expect(exit).toHaveBeenCalledTimes(1);
});
it("reports database-close failures without leaving the process running", async () => {
  const server = {
    close: (callback: () => void) => callback(),
    closeAllConnections: vi.fn(),
  };
  const exit = vi.fn();
  await createShutdown(server as unknown as Server, {
    markDraining: vi.fn(),
    closeDatabase: async () => {
      throw new Error("failed");
    },
    exit,
  })();
  expect(exit).toHaveBeenCalledExactlyOnceWith(1);
});
