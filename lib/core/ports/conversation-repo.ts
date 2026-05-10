import type { ConversationMessage } from "../types";

export type ConversationState = {
  id: string;
  tenantId: string;
  channelInstanceId: string;
  externalUserId: string;
  externalUserName: string | null;
  state: "active" | "handoff_active";
  handoffUntil: Date | null;
  recentMessages: ConversationMessage[];
};

export type GetOrCreateInput = {
  tenantId: string;
  channelInstanceId: string;
  externalUserId: string;
  externalUserName?: string | null;
};

export type AppendMessagesInput = {
  conversationId: string;
  messages: ConversationMessage[];
  windowSize?: number;
};

export interface ConversationRepo {
  getOrCreate(input: GetOrCreateInput): Promise<ConversationState>;
  appendMessages(input: AppendMessagesInput): Promise<void>;
}
