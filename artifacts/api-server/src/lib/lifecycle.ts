import type { Server } from "node:http";

export function parsePort(value: string | undefined): number {
  const port = Number(value);
  if (!value?.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}

export function createShutdown(
  server: Pick<Server, "close" | "closeAllConnections">,
  options: {
    markDraining: () => void;
    closeDatabase: () => Promise<void>;
    exit: (code: number) => void;
    timeoutMs?: number;
  },
) {
  let pending: Promise<void> | undefined;
  let requestedExitCode = 0;
  return function shutdown(exitCode = 0): Promise<void> {
    if (exitCode) requestedExitCode = exitCode;
    if (pending) return pending;
    options.markDraining();
    pending = new Promise<void>((resolve) => {
      let finished = false;
      const finish = (code: number) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadline);
        options.exit(code || requestedExitCode);
        resolve();
      };
      const deadline = setTimeout(() => {
        server.closeAllConnections();
        finish(1);
      }, options.timeoutMs ?? 10_000);
      server.close((error) => {
        void (async () => {
          let code = error ? 1 : 0;
          try {
            await options.closeDatabase();
          } catch {
            code = 1;
          }
          finish(code);
        })();
      });
    });
    return pending;
  };
}
