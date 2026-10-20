import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  images: vi.fn(),
  onVehicles: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
  },
}));
vi.mock("./middlewares/requireAuth", () => ({
  requireAuth: (req: any, res: any, next: () => void) => {
    if (!req.headers["x-role"]) {
      res.sendStatus(401);
      return;
    }
    req.auth = { userId: "staff", role: req.headers["x-role"] };
    next();
  },
}));
vi.mock("./lib/storage", () => ({ listingImagesProblem: mocks.images, imagesOnVehicles: mocks.onVehicles }));
vi.mock("./middlewares/security", () => ({ consumeAuthAttempt: mocks.limit }));
import router from "./routes/ai-photos";
let server: Server, base: string;
const draft = {
  title: "Blue car",
  description: "Blue sedan with four doors.",
  tags: [],
  skills: [],
  specs: [],
  vehicle: {
    make: "",
    model: "",
    bodyType: "sedan",
    fuel: "",
    transmission: "",
    drivetrain: "",
    powertrain: "",
    efficiency: "",
  },
};
const input = { kind: "vehicle", images: ["https://storage.example/car.jpg"] };
const post = (body: unknown, role = "china_representative") =>
  fetch(base + "/photos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(role ? { "x-role": role } : {}),
    },
    body: JSON.stringify(body),
  });
beforeAll(async () => {
  const app = express();
  app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllEnvs();
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  mocks.images.mockResolvedValue(null);
  mocks.onVehicles.mockResolvedValue([]);
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.create.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(draft) }],
  });
});
it("passes owned photo URLs as vision blocks and validates the returned draft", async () => {
  const response = await post(input);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(draft);
  expect(mocks.images).toHaveBeenCalledWith("staff", "product", input.images, []);
  const request = mocks.create.mock.calls[0][0];
  expect(request.messages[0].content[0]).toEqual({
    type: "image",
    source: { type: "url", url: input.images[0] },
  });
  expect(request.system).toContain("untrusted evidence");
});
it("requires auth, matching roles, valid bounded images and ownership before calling Anthropic", async () => {
  expect((await post(input, "")).status).toBe(401);
  expect((await post(input, "buyer")).status).toBe(403);
  expect((await post({ ...input, kind: "service" })).status).toBe(403);
  expect((await post({ ...input, images: [] })).status).toBe(400);
  expect(
    (await post({ ...input, images: Array(4).fill(input.images[0]) })).status,
  ).toBe(400);
  mocks.images.mockResolvedValue("Use photos you uploaded to this listing.");
  expect((await post(input)).status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("supports product and service photo suggestions with their upload purposes", async () => {
  for (const kind of ["product", "service"]) {
    expect((await post({ ...input, kind }, "seller")).status).toBe(200);
    expect(mocks.images).toHaveBeenLastCalledWith("staff", kind, input.images, []);
  }
});
it("fails gracefully when unconfigured, rate limited, incomplete or malformed", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  expect((await post(input)).status).toBe(503);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  mocks.limit.mockResolvedValueOnce({ allowed: false });
  expect((await post(input)).status).toBe(429);
  mocks.create.mockResolvedValueOnce({
    stop_reason: "max_tokens",
    content: [],
  });
  expect((await post(input)).status).toBe(502);
  mocks.create.mockResolvedValueOnce({
    stop_reason: "end_turn",
    content: [{ type: "text", text: "{}" }],
  });
  expect((await post(input)).status).toBe(502);
});
it("tidies a car draft to the form's choices and limits instead of failing", async () => {
  // Capitalised and unknown choices, too many tags and over-long text used to
  // fail validation and reach staff as a 502.
  mocks.create.mockResolvedValueOnce({
    stop_reason: "end_turn",
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ...draft,
          title: "x".repeat(300),
          tags: Array.from({ length: 11 }, (_, i) => `tag ${i}`),
          specs: Array.from({ length: 10 }, (_, i) => ({ name: `Spec ${i}`, value: "Yes" })),
          vehicle: { ...draft.vehicle, make: " Toyota ", bodyType: "SUV", fuel: "Diesel" },
        }),
      },
    ],
  });
  const response = await post(input);
  expect(response.status).toBe(200);
  const body = (await response.json()) as typeof draft & { tags: string[]; specs: unknown[] };
  expect(body.title).toHaveLength(200);
  expect(body.tags).toHaveLength(8);
  expect(body.specs).toHaveLength(8);
  expect(body.vehicle).toMatchObject({ make: "Toyota", bodyType: "suv", fuel: "" });
  // The model is offered only the form's body types and fuels.
  const vehicle = mocks.create.mock.calls[0][0].output_config.format.schema.properties.vehicle.properties;
  expect(vehicle.bodyType.enum).toEqual(["", "suv", "coupe-suv", "sedan", "pickup"]);
  expect(vehicle.fuel.enum).toEqual(["", "petrol", "hybrid", "electric"]);
});
it("lets staff analyse photos already on a catalogue vehicle that someone else uploaded", async () => {
  mocks.onVehicles.mockResolvedValueOnce(input.images);
  expect((await post(input, "manager")).status).toBe(200);
  expect(mocks.onVehicles).toHaveBeenCalledWith(input.images);
  expect(mocks.images).toHaveBeenCalledWith("staff", "product", input.images, input.images);
  // Products and services never borrow catalogue photos.
  await post({ ...input, kind: "product" }, "seller");
  expect(mocks.onVehicles).toHaveBeenCalledTimes(1);
});
