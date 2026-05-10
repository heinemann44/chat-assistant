import { describe, expect, it } from "vitest";

import { classifyIntent } from "./classifier";

describe("classifyIntent", () => {
  it.each([
    "oi",
    "Oi!",
    "olá",
    "Olá, tudo bem?",
    "ola",
    "OPA",
    "Bom dia",
    "  bom dia  ",
    "boa tarde, vocês têm horário disponível?",
    "boa noite!",
    "e aí, beleza?",
    "eai!",
    "hello",
    "hi there",
  ])("classifies %j as saudacao", (text) => {
    expect(classifyIntent(text)).toBe("saudacao");
  });

  it.each([
    "qual o preço?",
    "preciso de ajuda com meu pedido",
    "obrigado",
    "tchau",
    "",
    "   ",
  ])("classifies %j as outro", (text) => {
    expect(classifyIntent(text)).toBe("outro");
  });
});
