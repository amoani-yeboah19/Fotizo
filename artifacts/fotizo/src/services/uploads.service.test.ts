// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/api", async (original) => ({ ...(await original<typeof import("@/api")>()), AUTH_USE_MOCKS: false }));
import { uploadImage } from "./uploads.service";

afterEach(() => vi.unstubAllGlobals());

it("sends the image itself, not JSON, and returns the stored URL", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ url: "https://project.supabase.co/storage/v1/object/public/fotizo-images/product/u1/a.jpg" }), {
      status: 201,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
  const url = await uploadImage(photo, "product");
  expect(url).toMatch(/fotizo-images\/product\/u1\/a\.jpg$/);
  const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
  expect(target).toMatch(/\/uploads\/images\?purpose=product$/);
  expect(init.method).toBe("POST");
  expect(init.body).toBe(photo);
  expect(init.headers).toMatchObject({ "Content-Type": "image/jpeg", "X-Fotizo-Request": "1" });
  expect(init.credentials).toBe("include");
});

it("surfaces the server's reason when an upload is refused", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Upload a JPEG, PNG or WebP image." }), { status: 415 })),
  );
  await expect(uploadImage(new Blob(["<svg/>"], { type: "image/svg+xml" }), "product")).rejects.toMatchObject({
    status: 415,
    data: { error: "Upload a JPEG, PNG or WebP image." },
  });
});
