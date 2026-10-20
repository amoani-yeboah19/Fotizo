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

const FIELD_HINTS: Record<string, string> = {
  make: "Enter the make.",
  model: "Enter the model.",
  bodyType: "Choose a body type.",
  fuel: "Choose a fuel type.",
  seats: "Enter the number of seats (1 to 60).",
  transmission: "Enter the transmission.",
  drivetrain: "Enter the drivetrain.",
  powertrain: "Enter the engine or motor.",
  efficiency: "Enter the range or fuel economy.",
  landedPrice: "Enter an estimated landed price above zero.",
  leadTimeWeeks: "Enter lead times of 1 to 520 weeks, with the maximum at least the minimum.",
  images: "Add 1 to 12 photos uploaded through Fotizo.",
  highlights: "Keep highlights to 12 lines of up to 200 characters each.",
  description: "Enter a description (up to 10,000 characters).",
};

/** A message naming the first field that failed, for the vehicle editor. */
export function vehicleInputProblem(error: z.ZodError) {
  const field = error.issues[0]?.path[0];
  return (typeof field === "string" && FIELD_HINTS[field]) || "Check the vehicle details and try again.";
}
