import { createContext, useContext, useState, ReactNode } from "react";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: string;
  subject: string;
  messages: Message[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface MessagesContextType {
  conversations: Conversation[];
  sendMessage: (conversationId: string, content: string, senderId: string, senderName: string) => void;
  markAsRead: (conversationId: string) => void;
  startConversation: (participant: { id: string; name: string; avatar?: string; role: string }, subject: string) => string;
  totalUnread: number;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    participantId: "u2",
    participantName: "Sarah Jenkins",
    participantAvatar: "/images/avatar-2.png",
    participantRole: "Seller",
    subject: "Inquiry about Sony WH-1000XM5",
    lastMessage: "Thanks for reaching out! The headphones are in stock and ready to ship.",
    lastMessageTime: "2026-07-01T14:30:00Z",
    unreadCount: 1,
    messages: [
      {
        id: "m1",
        senderId: "u1",
        senderName: "Alex Morgan",
        content: "Hi Sarah, I'm interested in the Sony headphones. Are they still available?",
        timestamp: "2026-07-01T14:00:00Z",
        read: true,
      },
      {
        id: "m2",
        senderId: "u2",
        senderName: "Sarah Jenkins",
        senderAvatar: "/images/avatar-2.png",
        content: "Thanks for reaching out! The headphones are in stock and ready to ship.",
        timestamp: "2026-07-01T14:30:00Z",
        read: false,
      },
    ],
  },
  {
    id: "conv2",
    participantId: "u3",
    participantName: "Elena Rodriguez",
    participantAvatar: "/images/avatar-3.png",
    participantRole: "Professional",
    subject: "Business Strategy Consultation",
    lastMessage: "I can schedule a 30-minute discovery call on Thursday at 2pm GMT. Does that work?",
    lastMessageTime: "2026-06-30T09:15:00Z",
    unreadCount: 0,
    messages: [
      {
        id: "m3",
        senderId: "u1",
        senderName: "Alex Morgan",
        content: "Hello Elena, I'd like to discuss your business strategy consulting services.",
        timestamp: "2026-06-30T08:00:00Z",
        read: true,
      },
      {
        id: "m4",
        senderId: "u3",
        senderName: "Elena Rodriguez",
        senderAvatar: "/images/avatar-3.png",
        content: "I can schedule a 30-minute discovery call on Thursday at 2pm GMT. Does that work?",
        timestamp: "2026-06-30T09:15:00Z",
        read: true,
      },
    ],
  },
];

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  const sendMessage = (conversationId: string, content: string, senderId: string, senderName: string) => {
    const newMsg: Message = {
      id: `m${Date.now()}`,
      senderId,
      senderName,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: content,
              lastMessageTime: newMsg.timestamp,
            }
          : c
      )
    );

    setTimeout(() => {
      const replies = [
        "Thanks for your message! I'll get back to you shortly.",
        "Great question! Let me check on that for you.",
        "Absolutely, I can help with that.",
        "I appreciate you reaching out. Let me look into this.",
      ];
      const reply: Message = {
        id: `m${Date.now() + 1}`,
        senderId: "auto",
        senderName: "Fotizo Support",
        content: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toISOString(),
        read: false,
      };
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
            : c
        )
      );
    }, 1500);
  };

  const markAsRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      )
    );
  };

  const startConversation = (
    participant: { id: string; name: string; avatar?: string; role: string },
    subject: string
  ) => {
    const existing = conversations.find((c) => c.participantId === participant.id && c.subject === subject);
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
    <MessagesContext.Provider value={{ conversations, sendMessage, markAsRead, startConversation, totalUnread }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
