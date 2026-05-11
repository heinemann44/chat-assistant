import type { ConversationMessage } from "../types";

export const RATE_LIMIT_WARNING =
  "Você está enviando mensagens muito rápido. Aguarde um instante, por favor.";

const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10_000;

// Pure: given the user's prior message timestamps and the timestamp of the
// incoming one, decide whether to rate-limit. "Bursting" means BURST_LIMIT
// messages (including the new one) all landed within BURST_WINDOW_MS.
export function isBursting(
  priorUserMessageTimestamps: number[],
  incomingAt: number,
  burstLimit = BURST_LIMIT,
  windowMs = BURST_WINDOW_MS,
): boolean {
  const all = [...priorUserMessageTimestamps, incomingAt];
  if (all.length < burstLimit) return false;
  const lastN = all.slice(-burstLimit);
  const first = lastN[0]!;
  return incomingAt - first < windowMs;
}

// Convenience adapter so the webhook doesn't repeat the timestamp filter.
export function shouldRateLimit(
  history: ConversationMessage[],
  incomingAt: Date,
): boolean {
  const userAts = history
    .filter((m) => m.role === "user")
    .map((m) => new Date(m.at).getTime())
    .filter((n) => Number.isFinite(n));
  return isBursting(userAts, incomingAt.getTime());
}

// True when the last assistant message in history already issued the warning.
// Used by the webhook to silence repeated warnings inside a burst.
export function lastReplyWasRateLimitWarning(history: ConversationMessage[]): boolean {
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  return lastAssistant?.text === RATE_LIMIT_WARNING;
}
