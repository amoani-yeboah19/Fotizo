import { api, MESSAGES_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Conversation, Message } from "@/types";

const AUTO_REPLIES = [
  "Thanks for your message! I'll get back to you shortly.",
  "Great question! Let me check on that for you.",
  "Absolutely, I can help with that.",
  "I appreciate you reaching out. Let me look into this.",
];

type Participant = { id: string; name: string; avatar?: string; role: string };
type OfferInput = { description: string; amount: number };
type OfferResponse = "accepted" | "declined";

export const messagesService = {
  async listConversations(): Promise<Conversation[]> {
    if (MESSAGES_USE_MOCKS) {
      await delay();
      return structuredClone(fx.INITIAL_CONVERSATIONS);
    }
    return api.get<Conversation[]>("/conversations");
  },

  // Find-or-create a thread with a participant for a subject. The real backend
  // returns the existing thread (with history) if one already matches.
  async startConversation(participant: Participant, subject: string): Promise<Conversation> {
    if (MESSAGES_USE_MOCKS) {
      await delay();
      return {
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
    }
    return api.post<Conversation>("/conversations", { participantId: participant.id, subject });
  },

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    senderName: string,
  ): Promise<Message> {
    if (MESSAGES_USE_MOCKS) {
      return {
        id: `m${Date.now()}`,
        senderId,
        senderName,
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };
    }
    return api.post<Message>(`/conversations/${conversationId}/messages`, { content });
  },

  async sendOffer(
    conversationId: string,
    offer: OfferInput,
    senderId: string,
    senderName: string,
  ): Promise<Message> {
    if (MESSAGES_USE_MOCKS) {
      return {
        id: `m${Date.now()}`,
        senderId,
        senderName,
        content: "Sent an offer",
        timestamp: new Date().toISOString(),
        read: false,
        offer: { ...offer, status: "pending" },
      };
    }
    return api.post<Message>(`/conversations/${conversationId}/offers`, offer);
  },

  // Accept/decline an offer. Real backend returns the updated message; mocks
  // resolve to null and the context applies the change locally.
  async respondToOffer(
    conversationId: string,
    messageId: string,
    status: OfferResponse,
  ): Promise<Message | null> {
    if (MESSAGES_USE_MOCKS) return null;
    return api.post<Message>(`/conversations/${conversationId}/offers/${messageId}/respond`, {
      status,
    });
  },

  // Simulated counterpart reply. Only mocks fabricate one; against a real API
  // this resolves to null (real replies arrive via the context's polling).
  async getAutoReply(): Promise<Message | null> {
    if (!MESSAGES_USE_MOCKS) return null;
    await delay(1500);
    return {
      id: `m${Date.now() + 1}`,
      senderId: "auto",
      senderName: "Fotizo Support",
      content: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
      timestamp: new Date().toISOString(),
      read: false,
    };
  },

  async markAsRead(conversationId: string): Promise<void> {
    if (MESSAGES_USE_MOCKS) return;
    await api.post(`/conversations/${conversationId}/read`);
  },
};
