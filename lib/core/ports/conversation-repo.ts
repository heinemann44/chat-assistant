import type { ConversationMessage } from "../types";

export type ConversationState = {
  id: string;
  tenantId: string;
  channelInstanceId: string;
  externalUserId: string;
  externalUserName: string | null;
  businessConnectionId: string | null;
  state: "active" | "handoff_active";
  handoffUntil: Date | null;
  recentMessages: ConversationMessage[];
};

export type GetOrCreateInput = {
  tenantId: string;
  channelInstanceId: string;
  externalUserId: string;
  externalUserName?: string | null;
  businessConnectionId?: string | null;
};

export type AppendMessagesInput = {
  conversationId: string;
  messages: ConversationMessage[];
  windowSize?: number;
};

export type StartHandoffInput = {
  conversationId: string;
  handoffUntil: Date;
};

export interface ConversationRepo {
  getOrCreate(input: GetOrCreateInput): Promise<ConversationState>;
  appendMessages(input: AppendMessagesInput): Promise<void>;
  startHandoff(input: StartHandoffInput): Promise<void>;
  // Resumes the conversation if its handoff_until has already passed. Returns
  // true when it actually transitioned. Idempotent and safe to call on any
  // conversation state.
  resumeIfExpired(conversationId: string): Promise<boolean>;
}
