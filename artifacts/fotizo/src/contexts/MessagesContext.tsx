import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { messagesService } from "@/features/messaging/services";
import { MESSAGES_USE_MOCKS } from "@/api";
import type { Conversation, Message } from "@/types";

// Re-exported so existing consumers can keep importing these from the context.
export type { Conversation, Message } from "@/types";

// How often to pull the counterpart's new messages/read-receipts from the
// backend. Mocks are stateless (a refetch returns the seed), so polling only
// runs against a real API.
const POLL_MS = 6000;

type Participant = { id: string; name: string; avatar?: string; role: string };

interface MessagesContextType {
  conversations: Conversation[];
  sendMessage: (conversationId: string, content: string, senderId: string, senderName: string) => void;
  sendOffer: (
    conversationId: string,
    offer: { description: string; amount: number },
    senderId: string,
    senderName: string,
  ) => void;
  respondToOffer: (conversationId: string, messageId: string, status: "accepted" | "declined") => void;
  markAsRead: (conversationId: string) => void;
  startConversation: (participant: Participant, subject: string) => Promise<string>;
  totalUnread: number;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Non-zero while a local mutation is in flight, so a background poll can't
  // overwrite an optimistic update before the server reflects it.
  const busyRef = useRef(0);

  const patch = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  // Pull server truth. No-op on mocks (a refetch would wipe local state) and
  // while a mutation is mid-flight.
  const refresh = useCallback(async () => {
    if (MESSAGES_USE_MOCKS || busyRef.current > 0) return;
    try {
      const server = await messagesService.listConversations();
      if (busyRef.current === 0) setConversations(server);
    } catch {
      // Transient network/poll error — keep showing what we have.
    }
  }, []);

  // Initial load.
  useEffect(() => {
    let active = true;
    messagesService
      .listConversations()
      .then((seed) => {
        if (active) setConversations(seed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Poll for the other participant's activity (real backend only).
  useEffect(() => {
    if (MESSAGES_USE_MOCKS) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + c.unreadCount, 0),
    [conversations],
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string, senderId: string, senderName: string) => {
      // Show the message instantly with a temp id, then swap in the persisted
      // one (or roll back if the send fails).
      const optimistic: Message = {
        id: `local-${Date.now()}`,
        senderId,
        senderName,
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };
      patch(conversationId, (c) => ({
        ...c,
        messages: [...c.messages, optimistic],
        lastMessage: content,
        lastMessageTime: optimistic.timestamp,
      }));

      busyRef.current += 1;
      messagesService
        .sendMessage(conversationId, content, senderId, senderName)
        .then((real) => {
          patch(conversationId, (c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === optimistic.id ? real : m)),
          }));
        })
        .catch(() => {
          patch(conversationId, (c) => ({
            ...c,
            messages: c.messages.filter((m) => m.id !== optimistic.id),
          }));
        })
        .finally(() => {
          busyRef.current -= 1;
        });

      // Mock-only simulated reply (resolves to null against a real API).
      messagesService.getAutoReply().then((reply) => {
        if (!reply) return;
        patch(conversationId, (c) => ({
          ...c,
          messages: [...c.messages, reply],
          lastMessage: reply.content,
          lastMessageTime: reply.timestamp,
          unreadCount: c.unreadCount + 1,
        }));
      });
    },
    [patch],
  );

  const sendOffer = useCallback(
    (
      conversationId: string,
      offer: { description: string; amount: number },
      senderId: string,
      senderName: string,
    ) => {
      busyRef.current += 1;
      messagesService
        .sendOffer(conversationId, offer, senderId, senderName)
        .then((newMsg) => {
          patch(conversationId, (c) => ({
            ...c,
            messages: [...c.messages, newMsg],
            lastMessage: newMsg.content,
            lastMessageTime: newMsg.timestamp,
          }));
        })
        .catch(() => {})
        .finally(() => {
          busyRef.current -= 1;
        });
    },
    [patch],
  );

  const respondToOffer = useCallback(
    (conversationId: string, messageId: string, status: "accepted" | "declined") => {
      // Optimistic status flip, reverted to pending if the request fails.
      patch(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId && m.offer ? { ...m, offer: { ...m.offer, status } } : m,
        ),
      }));

      busyRef.current += 1;
      messagesService
        .respondToOffer(conversationId, messageId, status)
        .then((updated) => {
          if (!updated) return; // mock — optimistic update stands
          patch(conversationId, (c) => ({
            ...c,
            messages: c.messages.map((m) => (m.id === messageId ? updated : m)),
          }));
        })
        .catch(() => {
          patch(conversationId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId && m.offer ? { ...m, offer: { ...m.offer, status: "pending" } } : m,
            ),
          }));
        })
        .finally(() => {
          busyRef.current -= 1;
        });
    },
    [patch],
  );

  const markAsRead = useCallback(
    (conversationId: string) => {
      void messagesService.markAsRead(conversationId);
      patch(conversationId, (c) => ({
        ...c,
        unreadCount: 0,
        messages: c.messages.map((m) => ({ ...m, read: true })),
      }));
    },
    [patch],
  );

  const startConversation = useCallback(
    async (participant: Participant, subject: string): Promise<string> => {
      const existing = conversations.find(
        (c) => c.participantId === participant.id && c.subject === subject,
      );
      if (existing) return existing.id;

      busyRef.current += 1;
      try {
        const conv = await messagesService.startConversation(participant, subject);
        setConversations((prev) => (prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]));
        return conv.id;
      } finally {
        busyRef.current -= 1;
      }
    },
    [conversations],
  );

  const value = useMemo(
    () => ({ conversations, sendMessage, sendOffer, respondToOffer, markAsRead, startConversation, totalUnread }),
    [conversations, sendMessage, sendOffer, respondToOffer, markAsRead, startConversation, totalUnread],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
