import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "./prompt-builder";

describe("buildSystemPrompt", () => {
  it("includes the formal preset instruction", () => {
    const prompt = buildSystemPrompt({ tone: { preset: "formal" } });
    expect(prompt).toMatch(/tom formal/i);
  });

  it("includes the descontraido preset instruction", () => {
    const prompt = buildSystemPrompt({ tone: { preset: "descontraido" } });
    expect(prompt).toMatch(/tom descontra/i);
  });

  it("uses custom instructions when preset is custom", () => {
    const prompt = buildSystemPrompt({
      tone: { preset: "custom", customInstructions: "Fale como pirata." },
    });
    expect(prompt).toContain("Fale como pirata.");
    expect(prompt).not.toMatch(/tom formal/i);
  });

  it("appends intent hint and system extras when provided", () => {
    const prompt = buildSystemPrompt({
      tone: { preset: "casual" },
      intentHint: "O usuário cumprimentou. Retribua.",
      systemExtras: "Sempre mencione que somos 100% remote.",
    });
    expect(prompt).toContain("Retribua");
    expect(prompt).toContain("100% remote");
  });

  it("skips empty custom instructions silently", () => {
    const prompt = buildSystemPrompt({
      tone: { preset: "custom", customInstructions: "   " },
    });
    // Should still include the base instruction, just no tone block.
    expect(prompt).toMatch(/assistente de atendimento/i);
  });
});
