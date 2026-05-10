import { describe, expect, it } from "vitest";

import { processMessage } from "@/lib/core/pipeline";
import type { IncomingMessage, Tone } from "@/lib/core/types";

import { StubProvider } from "./stub";

const baseIncoming = (overrides: Partial<IncomingMessage> = {}): IncomingMessage => ({
  channel: "telegram",
  channelInstanceId: "ci-1",
  externalUserId: "u-1",
  text: "oi",
  receivedAt: new Date("2026-05-10T12:00:00Z"),
  ...overrides,
});

describe("StubProvider end-to-end through pipeline", () => {
  it("greets with a casual default for an empty text after the greeting intent fires", async () => {
    const stub = new StubProvider();
    const tone: Tone = { preset: "casual" };
    const { replies } = await processMessage(
      { incoming: baseIncoming({ text: "oi" }), tone },
      { llm: stub },
    );

    expect(replies[0]?.text).toMatch(/Olá|tudo bem|ajudar/i);
  });

  it("uses formal phrasing when the tone is formal", async () => {
    const stub = new StubProvider();
    const tone: Tone = { preset: "formal" };
    const { replies } = await processMessage(
      { incoming: baseIncoming({ text: "bom dia" }), tone },
      { llm: stub },
    );

    expect(replies[0]?.text).toMatch(/prezado/i);
  });

  it("echoes back a non-greeting message in the descontraido tone", async () => {
    const stub = new StubProvider();
    const tone: Tone = { preset: "descontraido" };
    const { replies } = await processMessage(
      { incoming: baseIncoming({ text: "qual o preço do produto x?" }), tone },
      { llm: stub },
    );

    expect(replies[0]?.text).toMatch(/E a[ií]/i);
    expect(replies[0]?.text).toContain("preço do produto x");
  });
});
