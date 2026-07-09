import { Router, type IRouter } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── Request validation ────────────────────────────────────────────────────────
const listingRequestSchema = z.object({
  kind: z.enum(["product", "service"]),
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(100),
  // Whatever the seller has typed so far — rough bullets, half-sentences, anything.
  notes: z.string().trim().max(2000).optional().default(""),
});

// ── Simple per-user rate limit (in-memory; resets on deploy) ─────────────────
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 20;
const usage = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (usage.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_PER_WINDOW) {
    usage.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  usage.set(userId, timestamps);
  return false;
}

// ── Structured output schemas (what Claude must return) ──────────────────────
// Structured outputs require additionalProperties: false on every object.
const productOutputSchema = {
  type: "object",
  properties: {
    description: {
      type: "string",
      description: "Compelling 2–3 paragraph marketplace product description",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "5-8 short search tags, lowercase",
    },
    specs: {
      type: "array",
      description: "3-6 key specifications as label/value pairs",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
        },
        required: ["name", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["description", "tags", "specs"],
  additionalProperties: false,
} as const;

const serviceOutputSchema = {
  type: "object",
  properties: {
    description: {
      type: "string",
      description: "Compelling 2–3 paragraph service description (what's offered, process, what clients get)",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "5-8 relevant skills/specialities, title case",
    },
  },
  required: ["description", "skills"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are Fotizo's listing copywriter. Fotizo is a marketplace connecting buyers with products, services, artisans and professionals across Ghana, the UK and the USA.

Write listing copy that is:
- Warm, confident and concrete — no hype words like "revolutionary" or "world-class"
- Honest: only claim what the seller's notes support; never invent measurements, materials, certifications or guarantees
- Scannable: short paragraphs, plain language, benefits before features
- In the seller's voice (first person for services, neutral for products)

Currency context: prices may be in GHS, GBP or USD — do not mention specific prices unless given.`;

// POST /ai/listing — generate description + tags/specs (product) or skills (service).
router.post("/listing", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({
      error: "AI writing isn't configured yet. Add ANTHROPIC_API_KEY to the server environment.",
    });
    return;
  }

  const parsed = listingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request.", issues: parsed.error.issues });
    return;
  }

  if (rateLimited(req.auth!.userId)) {
    res.status(429).json({ error: "You've hit the AI writing limit for now — try again in an hour." });
    return;
  }

  const { kind, title, category, notes } = parsed.data;

  const userPrompt =
    kind === "product"
      ? `Write the listing for this product.\n\nTitle: ${title}\nCategory: ${category}\nSeller's notes (may be rough or empty):\n${notes || "(none)"}`
      : `Write the listing for this professional service.\n\nService title: ${title}\nCategory: ${category}\nProvider's notes (may be rough or empty):\n${notes || "(none)"}`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: kind === "product" ? productOutputSchema : serviceOutputSchema,
        },
      },
      messages: [{ role: "user", content: userPrompt }],
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      res.status(502).json({ error: "The AI couldn't complete this listing. Try rephrasing your notes." });
      return;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      res.status(502).json({ error: "The AI returned an unexpected response. Please try again." });
      return;
    }

    // Structured outputs guarantee the text validates against the schema.
    res.json(JSON.parse(textBlock.text));
  } catch (err) {
    req.log?.error({ err }, "AI listing generation failed");
    if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "The AI service is busy — try again in a moment." });
      return;
    }
    res.status(502).json({ error: "AI writing failed. Please try again." });
  }
});

export default router;
