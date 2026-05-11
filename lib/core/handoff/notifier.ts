import type { HandoffRuntimeConfig } from "../ports/config-repo";
import type { ChannelAdapter } from "../ports/channel-adapter";

export type DispatchInput = {
  config: HandoffRuntimeConfig;
  message: string;
  // Used when notify_channel is 'telegram' — reuses the same bot adapter.
  channelAdapter: ChannelAdapter | null;
  // Optional metadata bundled into webhook payloads.
  payload?: Record<string, unknown>;
};

export type DispatchResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function dispatchHandoffNotification(
  input: DispatchInput,
): Promise<DispatchResult> {
  const { config, message, channelAdapter, payload } = input;
  if (!config.notifyTarget) {
    return { ok: false, reason: "notify_target not configured" };
  }

  switch (config.notifyChannel) {
    case "telegram": {
      if (!channelAdapter) {
        return { ok: false, reason: "no channel adapter for telegram notify" };
      }
      await channelAdapter.notifyOwner(config.notifyTarget, message);
      return { ok: true };
    }
    case "webhook": {
      const res = await fetch(config.notifyTarget, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, ...(payload ?? {}) }),
        cache: "no-store",
      });
      if (!res.ok) {
        return { ok: false, reason: `webhook ${res.status}` };
      }
      return { ok: true };
    }
    case "email":
      // Free Supabase plan doesn't include email; UI hides this option.
      return { ok: false, reason: "email notify not implemented" };
  }
}
