import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChannelAdapter } from "../ports/channel-adapter";

import { dispatchHandoffNotification } from "./notifier";

class FakeAdapter implements ChannelAdapter {
  readonly type = "telegram" as const;
  public sent: Array<{ target: string; text: string }> = [];
  async sendMessage() {}
  async notifyOwner(target: string, text: string) {
    this.sent.push({ target, text });
  }
}

describe("dispatchHandoffNotification", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends via channel adapter when notify_channel is telegram", async () => {
    const adapter = new FakeAdapter();
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "telegram",
        notifyTarget: "12345",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: adapter,
    });
    expect(result).toEqual({ ok: true });
    expect(adapter.sent).toEqual([{ target: "12345", text: "hello" }]);
  });

  it("POSTs JSON when notify_channel is webhook", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "webhook",
        notifyTarget: "https://hook.example/handoff",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: null,
      payload: { tenantId: "t1" },
    });
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hook.example/handoff",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"tenantId\":\"t1\""),
      }),
    );
  });

  it("returns reason when webhook returns non-2xx", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "webhook",
        notifyTarget: "https://hook.example/handoff",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("webhook 500");
  });

  it("returns reason when notify_target is missing", async () => {
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "telegram",
        notifyTarget: null,
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: new FakeAdapter(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("notify_target not configured");
  });
});
