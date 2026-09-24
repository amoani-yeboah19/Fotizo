import { afterEach, expect, it, vi } from "vitest";
import { changeManagedAccountStatus } from "@workspace/api-client-react";
afterEach(() => vi.unstubAllGlobals());
it("sends the required browser-write header and version through the generated client", async () => {
  const result = {
    id: "5d4d15b8-5797-440f-87af-fac16a6a4ee9",
    statusVersion: 1,
    suspendedAt: "2026-09-24T12:00:00Z",
    auditId: "2e0b4a94-d7c1-4cf3-90cc-cbf12615b7dd",
  };
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", request);
  const body = {
    action: "suspend" as const,
    expectedVersion: 0,
    reason: "Verified abuse report.",
  };
  expect(await changeManagedAccountStatus(result.id, body)).toEqual(result);
  const [url, options] = request.mock.calls[0];
  expect(url).toBe(`/api/admin/accounts/${result.id}/status`);
  expect(options?.method).toBe("POST");
  expect(new Headers(options?.headers).get("X-Fotizo-Request")).toBe("1");
  expect(JSON.parse(options?.body as string)).toEqual(body);
});
