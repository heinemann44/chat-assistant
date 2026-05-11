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

  it("renders the FAQ block when faqs are provided", () => {
    const prompt = buildSystemPrompt({
      tone: { preset: "casual" },
      faqs: [
        { id: "1", question: "Qual o horário?", answer: "Seg a sex, 9-18h", keywords: [] },
        { id: "2", question: "Aceitam Pix?", answer: "Sim, chave CNPJ.", keywords: [] },
      ],
    });
    expect(prompt).toMatch(/base de conhecimento/i);
    expect(prompt).toContain("Qual o horário?");
    expect(prompt).toContain("Seg a sex, 9-18h");
    expect(prompt).toContain("Aceitam Pix?");
  });

  it("omits the FAQ block when faqs is empty or undefined", () => {
    const prompt = buildSystemPrompt({ tone: { preset: "casual" }, faqs: [] });
    expect(prompt).not.toMatch(/base de conhecimento/i);
  });
});
