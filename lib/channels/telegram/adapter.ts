import type { ChannelAdapter } from "@/lib/core/ports/channel-adapter";

import { sendMessage } from "./api";

export class TelegramAdapter implements ChannelAdapter {
  readonly type = "telegram" as const;

  constructor(private readonly token: string) {}

  async sendMessage(externalUserId: string, text: string): Promise<void> {
    await sendMessage(this.token, externalUserId, text);
  }

  async notifyOwner(target: string, text: string): Promise<void> {
    // For Telegram, target is a chat_id (configured in handoff_config).
    await sendMessage(this.token, target, text);
  }
}
