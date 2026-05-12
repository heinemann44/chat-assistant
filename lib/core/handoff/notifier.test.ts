import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChannelAdapter } from "../ports/channel-adapter";

import { dispatchHandoffNotification } from "./notifier";

// The notifier resolves the webhook hostname before fetching to block SSRF
// targets. In tests we stub the resolver to return a public IP so the guard
// lets the mocked fetch through.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

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

  it("blocks webhook target that resolves to a private/link-local IP", async () => {
    const dns = await import("node:dns/promises");
    vi.mocked(dns.lookup).mockResolvedValueOnce([
      { address: "169.254.169.254", family: 4 },
    ] as never);
    const fetchMock = vi.mocked(fetch);
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "webhook",
        notifyTarget: "https://imds.example/handoff",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("webhook target resolves to blocked ip");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks http:// webhook target", async () => {
    const fetchMock = vi.mocked(fetch);
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "webhook",
        notifyTarget: "http://hook.example/handoff",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("webhook must use https");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks loopback IP literal as webhook target", async () => {
    const fetchMock = vi.mocked(fetch);
    const result = await dispatchHandoffNotification({
      config: {
        notifyChannel: "webhook",
        notifyTarget: "https://127.0.0.1/handoff",
        autoResumeMinutes: 30,
        triggerKeywords: [],
      },
      message: "hello",
      channelAdapter: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("webhook target resolves to blocked ip");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
