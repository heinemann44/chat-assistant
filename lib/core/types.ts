export type ChannelType = "telegram" | "whatsapp" | "slack" | "discord";

export type Intent = "saudacao" | "faq" | "handoff" | "outro";

export type TonePreset = "formal" | "casual" | "descontraido" | "custom";

export type Tone = {
  preset: TonePreset;
  customInstructions?: string | null;
};

export type IncomingMessage = {
  channel: ChannelType;
  channelInstanceId: string;
  externalUserId: string;
  externalUserName?: string;
  text: string;
  receivedAt: Date;
};

export type OutgoingMessage = {
  text: string;
};

export type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
  at: string;
};

export type ConversationContext = {
  tenantId: string;
  channelInstanceId: string;
  externalUserId: string;
  state: "active" | "handoff_active";
  handoffUntil: Date | null;
  recentMessages: ConversationMessage[];
};
