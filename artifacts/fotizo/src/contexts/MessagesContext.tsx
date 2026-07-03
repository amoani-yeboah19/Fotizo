import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { messagesService } from "@/services";
import type { Conversation } from "@/types";

// Re-exported so existing consumers can keep importing these from the context.
export type { Conversation, Message } from "@/types";

interface MessagesContextType {
  conversations: Conversation[];
  sendMessage: (conversationId: string, content: string, senderId: string, senderName: string) => void;
  markAsRead: (conversationId: string) => void;
  startConversation: (
    participant: { id: string; name: string; avatar?: string; role: string },
    subject: string,
  ) => string;
  totalUnread: number;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    let active = true;
    messagesService.listConversations().then((seed) => {
      if (active) setConversations(seed);
    });
    return () => {
      active = false;
    };
  }, []);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  const sendMessage = (
    conversationId: string,
    content: string,
    senderId: string,
    senderName: string,
  ) => {
    messagesService.sendMessage(conversationId, content, senderId, senderName).then((newMsg) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, newMsg],
                lastMessage: content,
                lastMessageTime: newMsg.timestamp,
              }
            : c,
        ),
      );
    });

    // The counterpart reply is a backend concern; on mocks it resolves after a delay,
    // against a real API it resolves to null and nothing happens here.
    messagesService.getAutoReply().then((reply) => {
      if (!reply) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, reply],
                lastMessage: reply.content,
                lastMessageTime: reply.timestamp,
                unreadCount: c.unreadCount + 1,
              }
            : c,
        ),
      );
    });
  };

  const markAsRead = (conversationId: string) => {
    void messagesService.markAsRead(conversationId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c,
      ),
    );
  };

  const startConversation = (
    participant: { id: string; name: string; avatar?: string; role: string },
    subject: string,
  ) => {
    const existing = conversations.find(
      (c) => c.participantId === participant.id && c.subject === subject,
    );
    if (existing) return existing.id;
    const newConv: Conversation = {
      id: `conv${Date.now()}`,
      participantId: participant.id,
      participantName: participant.name,
      participantAvatar: participant.avatar,
      participantRole: participant.role,
      subject,
      messages: [],
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    return newConv.id;
  };

  return (
    <MessagesContext.Provider
      value={{ conversations, sendMessage, markAsRead, startConversation, totalUnread }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
