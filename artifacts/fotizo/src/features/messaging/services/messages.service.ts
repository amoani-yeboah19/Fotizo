import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Conversation, Message } from "@/types";

const AUTO_REPLIES = [
  "Thanks for your message! I'll get back to you shortly.",
  "Great question! Let me check on that for you.",
  "Absolutely, I can help with that.",
  "I appreciate you reaching out. Let me look into this.",
];

export const messagesService = {
  async listConversations(): Promise<Conversation[]> {
    if (USE_MOCKS) {
      await delay();
      return structuredClone(fx.INITIAL_CONVERSATIONS);
    }
    return api.get<Conversation[]>("/conversations");
  },

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    senderName: string,
  ): Promise<Message> {
    if (USE_MOCKS) {
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

  // Simulated counterpart reply. Backend delivers real replies (e.g. via polling or
  // websockets), so against a real API this resolves to null and the UI does nothing.
  async getAutoReply(): Promise<Message | null> {
    if (!USE_MOCKS) return null;
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
    if (USE_MOCKS) return;
    await api.post(`/conversations/${conversationId}/read`);
  },
};
