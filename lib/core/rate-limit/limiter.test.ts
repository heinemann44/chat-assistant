import { describe, expect, it } from "vitest";

import type { ConversationMessage } from "../types";

import {
  isBursting,
  lastReplyWasRateLimitWarning,
  RATE_LIMIT_WARNING,
  shouldRateLimit,
} from "./limiter";

const at = (offsetMs: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + offsetMs);

describe("isBursting", () => {
  it("does not flag a slow conversation", () => {
    const ats = [0, 5_000, 12_000, 25_000];
    expect(isBursting(ats, 40_000)).toBe(false);
  });

  it("flags 5 messages within 10s", () => {
    // 4 prior + 1 incoming, all within 10s
    expect(isBursting([0, 2000, 4000, 6000], 8000)).toBe(true);
  });

  it("does not flag exactly at the window boundary", () => {
    expect(isBursting([0, 2000, 4000, 6000], 10_000)).toBe(false);
  });

  it("does not flag when there are fewer than burstLimit messages total", () => {
    expect(isBursting([0, 100, 200], 300)).toBe(false);
  });
});

describe("shouldRateLimit", () => {
  it("ignores assistant messages when counting bursts", () => {
    const history: ConversationMessage[] = [
      { role: "user", text: "1", at: at(0).toISOString() },
      { role: "assistant", text: "a", at: at(100).toISOString() },
      { role: "user", text: "2", at: at(1000).toISOString() },
      { role: "assistant", text: "b", at: at(1100).toISOString() },
      { role: "user", text: "3", at: at(2000).toISOString() },
      { role: "user", text: "4", at: at(3000).toISOString() },
    ];
    expect(shouldRateLimit(history, at(4000))).toBe(true);
  });

  it("returns false on a normal cadence", () => {
    const history: ConversationMessage[] = [
      { role: "user", text: "1", at: at(0).toISOString() },
      { role: "assistant", text: "a", at: at(100).toISOString() },
      { role: "user", text: "2", at: at(20_000).toISOString() },
    ];
    expect(shouldRateLimit(history, at(40_000))).toBe(false);
  });
});

describe("lastReplyWasRateLimitWarning", () => {
  it("returns true when the most recent assistant message is the warning", () => {
    const history: ConversationMessage[] = [
      { role: "user", text: "oi", at: at(0).toISOString() },
      { role: "assistant", text: RATE_LIMIT_WARNING, at: at(100).toISOString() },
    ];
    expect(lastReplyWasRateLimitWarning(history)).toBe(true);
  });

  it("returns false when a regular reply came after the warning", () => {
    const history: ConversationMessage[] = [
      { role: "assistant", text: RATE_LIMIT_WARNING, at: at(0).toISOString() },
      { role: "user", text: "ok", at: at(60_000).toISOString() },
      { role: "assistant", text: "Tudo certo!", at: at(60_100).toISOString() },
    ];
    expect(lastReplyWasRateLimitWarning(history)).toBe(false);
  });

  it("returns false when there are no assistant messages", () => {
    expect(lastReplyWasRateLimitWarning([])).toBe(false);
  });
});
