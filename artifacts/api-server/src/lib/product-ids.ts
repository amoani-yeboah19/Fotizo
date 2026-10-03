import { z } from "zod";
import { resolveProductId } from "@workspace/db";

/**
 * A product id from a URL, cart or form: a UUID, or a Fotizo Shop catalogue
 * id ("ali-…", "taobao-…") from before the shop moved to the API, mapped to
 * the UUID it is stored under.
 */
export const productIdSchema = z
  .string()
  .transform((value, ctx) => {
    const id = resolveProductId(value);
    if (!id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unknown product." });
      return z.NEVER;
    }
    return id;
  });
