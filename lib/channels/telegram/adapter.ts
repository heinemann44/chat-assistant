import type { ChannelAdapter } from "@/lib/core/ports/channel-adapter";

import { sendMessage } from "./api";

export type TelegramAdapterOptions = {
  // When set, all outbound replies route via this business connection so they
  // appear in the managed account's chat (not as a DM from the bot itself).
  // notifyOwner stays unaffected — it always uses the bot's own identity.
  businessConnectionId?: string;
};

export class TelegramAdapter implements ChannelAdapter {
  readonly type = "telegram" as const;

  constructor(
    private readonly token: string,
    private readonly options: TelegramAdapterOptions = {},
  ) {}

  async sendMessage(externalUserId: string, text: string): Promise<void> {
    await sendMessage(this.token, externalUserId, text, {
      businessConnectionId: this.options.businessConnectionId,
    });
  }

  async notifyOwner(target: string, text: string): Promise<void> {
    // For Telegram, target is a chat_id (configured in handoff_config).
    // Owner notifications always go via the bot's own identity, never via a
    // business connection — they're meta-messages about a conversation.
    await sendMessage(this.token, target, text);
  }
}
