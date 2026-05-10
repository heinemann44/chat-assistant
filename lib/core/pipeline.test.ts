import { describe, expect, it } from "vitest";

import { processMessage } from "./pipeline";
import type { LLMProvider, LLMRequest } from "./ports/llm-provider";
import type { IncomingMessage, Tone } from "./types";

class FakeLLM implements LLMProvider {
  readonly name = "fake";
  public lastRequest: LLMRequest | null = null;
  constructor(private response: string = "ok") {}
  async complete(request: LLMRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const baseIncoming = (overrides: Partial<IncomingMessage> = {}): IncomingMessage => ({
  channel: "telegram",
  channelInstanceId: "ci-1",
  externalUserId: "u-1",
  text: "oi",
  receivedAt: new Date("2026-05-10T12:00:00Z"),
  ...overrides,
});

const casual: Tone = { preset: "casual" };

describe("processMessage", () => {
  it("classifies a greeting and returns a single reply from the LLM", async () => {
    const llm = new FakeLLM("Olá! Como posso ajudar?");
    const result = await processMessage(
      { incoming: baseIncoming({ text: "oi" }), tone: casual },
      { llm },
    );

    expect(result.intent).toBe("saudacao");
    expect(result.replies).toEqual([{ text: "Olá! Como posso ajudar?" }]);
  });

  it("classifies non-greetings as outro", async () => {
    const llm = new FakeLLM("Vou verificar para você.");
    const result = await processMessage(
      { incoming: baseIncoming({ text: "qual o preço?" }), tone: casual },
      { llm },
    );

    expect(result.intent).toBe("outro");
  });

  it("includes a greeting hint in the system prompt when intent is saudacao", async () => {
    const llm = new FakeLLM();
    await processMessage(
      { incoming: baseIncoming({ text: "bom dia" }), tone: casual },
      { llm },
    );

    expect(llm.lastRequest?.systemPrompt).toMatch(/cumprimentar/i);
  });

  it("does not include a greeting hint for other intents", async () => {
    const llm = new FakeLLM();
    await processMessage(
      { incoming: baseIncoming({ text: "preciso de ajuda" }), tone: casual },
      { llm },
    );

    expect(llm.lastRequest?.systemPrompt).not.toMatch(/cumprimentar/i);
  });

  it("threads conversation history before the current user message", async () => {
    const llm = new FakeLLM();
    await processMessage(
      {
        incoming: baseIncoming({ text: "e o preço?" }),
        tone: casual,
        history: [
          { role: "user", text: "quanto custa?", at: "2026-05-10T11:59:00Z" },
          { role: "assistant", text: "R$ 100", at: "2026-05-10T11:59:01Z" },
        ],
      },
      { llm },
    );

    expect(llm.lastRequest?.messages).toHaveLength(3);
    expect(llm.lastRequest?.messages[0]?.text).toBe("quanto custa?");
    expect(llm.lastRequest?.messages.at(-1)?.text).toBe("e o preço?");
  });

  it("propagates the configured tone preset into the system prompt", async () => {
    const llm = new FakeLLM();
    await processMessage(
      { incoming: baseIncoming({ text: "oi" }), tone: { preset: "formal" } },
      { llm },
    );

    expect(llm.lastRequest?.systemPrompt).toMatch(/tom formal/i);
  });
});
