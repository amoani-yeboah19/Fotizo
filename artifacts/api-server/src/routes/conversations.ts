import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, or, asc, desc, inArray } from "drizzle-orm";
import {
  db,
  conversationsTable,
  messagesTable,
  usersTable,
  type ConversationRow,
  type MessageRow,
  type UserRow,
} from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── Public-shape mappers ─────────────────────────────────────────────────────

// A message is "read" once its recipient's lastReadAt is at or past when it was
// sent. recipientLastReadAt is the *other* participant's clock for a message I
// sent, and my clock for a message I received.
function toPublicMessage(
  m: MessageRow,
  sender: Pick<UserRow, "name" | "avatar"> | undefined,
  recipientLastReadAt: Date | null,
) {
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: sender?.name ?? "Unknown",
    senderAvatar: sender?.avatar ?? undefined,
    content: m.content,
    timestamp: m.createdAt.toISOString(),
    read: recipientLastReadAt != null && recipientLastReadAt >= m.createdAt,
    offer:
      m.offerDescription != null && m.offerAmount != null && m.offerStatus != null
        ? { description: m.offerDescription, amount: m.offerAmount, status: m.offerStatus }
        : undefined,
  };
}

// Build the client's Conversation shape from the current user's point of view:
// the "participant" is always the other person, and unread counts only the
// other person's messages I haven't seen.
function toPublicConversation(
  conv: ConversationRow,
  meId: string,
  usersById: Map<string, UserRow>,
  messages: MessageRow[],
) {
  const meIsA = conv.participantAId === meId;
  const otherId = meIsA ? conv.participantBId : conv.participantAId;
  const other = usersById.get(otherId);
  const myLastReadAt = meIsA ? conv.participantALastReadAt : conv.participantBLastReadAt;
  const otherLastReadAt = meIsA ? conv.participantBLastReadAt : conv.participantALastReadAt;

  const publicMessages = messages.map((m) =>
    toPublicMessage(
      m,
      usersById.get(m.senderId),
      m.senderId === meId ? otherLastReadAt : myLastReadAt,
    ),
  );

  const last = messages[messages.length - 1];
  const unreadCount = messages.filter(
    (m) => m.senderId === otherId && (myLastReadAt == null || m.createdAt > myLastReadAt),
  ).length;

  return {
    id: conv.id,
    participantId: otherId,
    participantName: other?.name ?? "Unknown",
    participantAvatar: other?.avatar ?? undefined,
    participantRole: other?.role ?? "buyer",
    subject: conv.subject,
    messages: publicMessages,
    lastMessage: last?.content ?? "",
    lastMessageTime: (last?.createdAt ?? conv.updatedAt).toISOString(),
    unreadCount,
  };
}

// Fetch a conversation and confirm the caller is one of its two participants.
// Accepts the raw route param (Express types it string | string[]) and treats a
// non-UUID as "not found". Returns the row, null, or "forbidden".
async function loadForUser(
  convId: unknown,
  meId: string,
): Promise<ConversationRow | null | "forbidden"> {
  const parsed = z.string().uuid().safeParse(convId);
  if (!parsed.success) return null;
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, parsed.data));
  if (!conv) return null;
  if (conv.participantAId !== meId && conv.participantBId !== meId) return "forbidden";
  return conv;
}

async function findUser(id: string): Promise<UserRow | undefined> {
  return db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
}

// ── Routes ───────────────────────────────────────────────────────────────────

// All conversations I'm part of, newest activity first, each with its full
// message history embedded (marketplace threads stay small).
router.get("/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(
      or(eq(conversationsTable.participantAId, meId), eq(conversationsTable.participantBId, meId)),
    )
    .orderBy(desc(conversationsTable.updatedAt));

  if (convs.length === 0) {
    res.json([]);
    return;
  }

  const convIds = convs.map((c) => c.id);
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(inArray(messagesTable.conversationId, convIds))
    .orderBy(asc(messagesTable.createdAt));

  const userIds = new Set<string>();
  for (const c of convs) {
    userIds.add(c.participantAId);
    userIds.add(c.participantBId);
  }
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, [...userIds]));
  const usersById = new Map(users.map((u) => [u.id, u]));

  const msgsByConv = new Map<string, MessageRow[]>();
  for (const m of msgs) {
    const arr = msgsByConv.get(m.conversationId) ?? [];
    arr.push(m);
    msgsByConv.set(m.conversationId, arr);
  }

  res.json(convs.map((c) => toPublicConversation(c, meId, usersById, msgsByConv.get(c.id) ?? [])));
});

const startSchema = z.object({
  participantId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
});

// Find-or-create a conversation with another user for a given subject. Same
// participant + same subject always resolves to one thread (idempotent), so a
// buyer clicking "Message" twice doesn't spawn duplicates.
router.post("/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request.", issues: parsed.error.issues });
    return;
  }
  const { participantId, subject } = parsed.data;
  if (participantId === meId) {
    res.status(400).json({ error: "You can't start a conversation with yourself." });
    return;
  }

  const participant = await findUser(participantId);
  if (!participant) {
    res.status(404).json({ error: "That user no longer exists." });
    return;
  }

  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.subject, subject),
        or(
          and(
            eq(conversationsTable.participantAId, meId),
            eq(conversationsTable.participantBId, participantId),
          ),
          and(
            eq(conversationsTable.participantAId, participantId),
            eq(conversationsTable.participantBId, meId),
          ),
        ),
      ),
    );

  let conv = existing;
  if (!conv) {
    [conv] = await db
      .insert(conversationsTable)
      .values({ participantAId: meId, participantBId: participantId, subject })
      .returning();
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(asc(messagesTable.createdAt));

  const me = await findUser(meId);
  const usersById = new Map<string, UserRow>();
  if (me) usersById.set(meId, me);
  usersById.set(participantId, participant);

  res.status(existing ? 200 : 201).json(toPublicConversation(conv, meId, usersById, msgs));
});

const messageSchema = z.object({ content: z.string().trim().min(1).max(5000) });

router.post("/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Message can't be empty." });
    return;
  }
  const conv = await loadForUser(req.params.id, meId);
  if (conv === null) return void res.status(404).json({ error: "Conversation not found." });
  if (conv === "forbidden") return void res.status(403).json({ error: "Not your conversation." });

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: conv.id, senderId: meId, content: parsed.data.content })
    .returning();
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conv.id));

  const sender = await findUser(meId);
  const otherLastReadAt =
    conv.participantAId === meId ? conv.participantBLastReadAt : conv.participantALastReadAt;
  res.status(201).json(toPublicMessage(msg, sender, otherLastReadAt));
});

const offerSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  amount: z.number().positive().max(10_000_000),
});

router.post("/conversations/:id/offers", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a description and an amount greater than 0." });
    return;
  }
  const conv = await loadForUser(req.params.id, meId);
  if (conv === null) return void res.status(404).json({ error: "Conversation not found." });
  if (conv === "forbidden") return void res.status(403).json({ error: "Not your conversation." });

  const [msg] = await db
    .insert(messagesTable)
    .values({
      conversationId: conv.id,
      senderId: meId,
      content: "Sent an offer",
      offerDescription: parsed.data.description,
      offerAmount: parsed.data.amount,
      offerStatus: "pending",
    })
    .returning();
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conv.id));

  const sender = await findUser(meId);
  const otherLastReadAt =
    conv.participantAId === meId ? conv.participantBLastReadAt : conv.participantALastReadAt;
  res.status(201).json(toPublicMessage(msg, sender, otherLastReadAt));
});

const respondSchema = z.object({ status: z.enum(["accepted", "declined"]) });

// Only the *recipient* of an offer can accept or decline it, and only while it's
// still pending — the sender can't answer their own offer, and answers are final.
router.post(
  "/conversations/:id/offers/:messageId/respond",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const meId = req.auth!.userId;
    const parsed = respondSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose accept or decline." });
      return;
    }
    const conv = await loadForUser(req.params.id, meId);
    if (conv === null) return void res.status(404).json({ error: "Conversation not found." });
    if (conv === "forbidden") return void res.status(403).json({ error: "Not your conversation." });

    const messageId = z.string().uuid().safeParse(req.params.messageId);
    if (!messageId.success) {
      res.status(404).json({ error: "Offer not found." });
      return;
    }

    const [msg] = await db
      .select()
      .from(messagesTable)
      .where(
        and(eq(messagesTable.id, messageId.data), eq(messagesTable.conversationId, conv.id)),
      );
    if (!msg || msg.offerStatus == null) {
      res.status(404).json({ error: "Offer not found." });
      return;
    }
    if (msg.senderId === meId) {
      res.status(403).json({ error: "You can't respond to your own offer." });
      return;
    }
    if (msg.offerStatus !== "pending") {
      res.status(409).json({ error: "This offer has already been answered." });
      return;
    }

    const [updated] = await db
      .update(messagesTable)
      .set({ offerStatus: parsed.data.status })
      .where(eq(messagesTable.id, msg.id))
      .returning();

    const sender = await findUser(updated.senderId);
    const myLastReadAt =
      conv.participantAId === meId ? conv.participantALastReadAt : conv.participantBLastReadAt;
    res.json(toPublicMessage(updated, sender, myLastReadAt));
  },
);

// Mark everything in this conversation as read for me (moves my read clock to now).
router.post("/conversations/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  const meId = req.auth!.userId;
  const conv = await loadForUser(req.params.id, meId);
  if (conv === null) return void res.status(404).json({ error: "Conversation not found." });
  if (conv === "forbidden") return void res.status(403).json({ error: "Not your conversation." });

  await db
    .update(conversationsTable)
    .set(
      conv.participantAId === meId
        ? { participantALastReadAt: new Date() }
        : { participantBLastReadAt: new Date() },
    )
    .where(eq(conversationsTable.id, conv.id));
  res.status(204).end();
});

export default router;
