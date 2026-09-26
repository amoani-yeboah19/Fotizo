import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  vehicleEnquiriesTable,
  type VehicleRow,
} from "@workspace/db";
import { consumeAuthAttempt } from "../middlewares/security";
import { caseReference, optionalUserId } from "../lib/cases";

const router: IRouter = Router();

// The public catalogue is small and curated; this bound keeps a runaway import
// from producing an unbounded response.
const MAX_VEHICLES = 200;

export function toPublicVehicle(v: VehicleRow) {
  return {
    id: v.id,
    slug: v.slug,
    make: v.make,
    model: v.model,
    bodyType: v.bodyType,
    fuel: v.fuel,
    seats: v.seats,
    transmission: v.transmission,
    drivetrain: v.drivetrain,
    powertrain: v.powertrain,
    efficiency: v.efficiency,
    landedPrice: v.landedPrice,
    leadTimeWeeks: [v.leadTimeMinWeeks, v.leadTimeMaxWeeks] as const,
    image: v.images[0] ?? "",
    images: v.images,
    highlights: v.highlights,
    description: v.description,
    status: v.status,
  };
}

router.get("/vehicles", async (_req, res) => {
  const rows = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.status, "active"))
    .orderBy(asc(vehiclesTable.landedPrice), asc(vehiclesTable.id))
    .limit(MAX_VEHICLES);
  res.json(rows.map(toPublicVehicle));
});

router.get("/vehicles/:slug", async (req, res) => {
  const slug = z.string().max(120).safeParse(req.params.slug);
  const [row] = slug.success
    ? await db
        .select()
        .from(vehiclesTable)
        .where(
          and(
            eq(vehiclesTable.slug, slug.data),
            eq(vehiclesTable.status, "active"),
          ),
        )
    : [];
  if (!row) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.json(toPublicVehicle(row));
});

const enquirySchema = z
  .object({
    vehicleId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(5).max(40),
    destination: z.string().trim().min(2).max(120),
    message: z.string().trim().max(2000).default(""),
  })
  .strict();

router.post("/vehicle-enquiries", async (req, res) => {
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Enter your name, a valid email address, a phone number and the destination country.",
    });
    return;
  }
  const limit = await consumeAuthAttempt(`enquiry:${req.ip ?? "unknown"}`, 10);
  if (!limit.allowed) {
    res.setHeader("Retry-After", limit.retryAfter);
    res.status(429).json({
      error: "Too many requests from this connection. Please try again later.",
    });
    return;
  }
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(
      and(
        eq(vehiclesTable.id, parsed.data.vehicleId),
        eq(vehiclesTable.status, "active"),
      ),
    );
  if (!vehicle) {
    res
      .status(404)
      .json({ error: "This vehicle is no longer listed. Refresh and try again." });
    return;
  }
  const [row] = await db
    .insert(vehicleEnquiriesTable)
    .values({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      reference: caseReference("FZV"),
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      quotedLandedPrice: vehicle.landedPrice,
      userId: await optionalUserId(req),
    })
    .returning();
  res.status(201).json({
    id: row.id,
    reference: row.reference,
    vehicleId: row.vehicleId,
    vehicleName: row.vehicleName,
    name: row.name,
    email: row.email,
    phone: row.phone,
    destination: row.destination,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
