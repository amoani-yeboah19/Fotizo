import { z } from "zod";

export const vehicleInput = z
  .object({
    make: z.string().trim().min(1).max(100),
    model: z.string().trim().min(1).max(150),
    bodyType: z.enum(["suv", "coupe-suv", "sedan", "pickup"]),
    fuel: z.enum(["petrol", "hybrid", "electric"]),
    seats: z.number().int().min(1).max(60),
    transmission: z.string().trim().min(1).max(100),
    drivetrain: z.string().trim().min(1).max(100),
    powertrain: z.string().trim().min(1).max(300),
    efficiency: z.string().trim().min(1).max(300),
    landedPrice: z.number().positive().max(9999999999.99),
    leadTimeWeeks: z
      .tuple([
        z.number().int().min(1).max(520),
        z.number().int().min(1).max(520),
      ])
      .refine(
        ([min, max]) => max >= min,
        "Maximum lead time must follow minimum",
      ),
    images: z
      .array(
        z
          .string()
          .url()
          .max(2048)
          .refine(
            (url) => url.startsWith("https://"),
            "Use uploaded HTTPS photos",
          ),
      )
      .min(1)
      .max(12),
    highlights: z.array(z.string().trim().min(1).max(200)).max(12),
    description: z.string().trim().min(1).max(10000),
  })
  .strict();
