import type { ChannelType } from "../types";

// Outbound side of a channel. Inbound translation (channel payload →
// IncomingMessage) happens in the channel-specific webhook handler, not here.
export interface ChannelAdapter {
  readonly type: ChannelType;
  sendMessage(externalUserId: string, text: string): Promise<void>;
  notifyOwner(target: string, text: string): Promise<void>;
}
