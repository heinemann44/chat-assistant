import { describe, expect, it } from "vitest";

import { detectHandoffIntent } from "./detector";

const keywords = ["atendente", "humano", "pessoa", "falar com"];

describe("detectHandoffIntent", () => {
  it.each([
    "quero falar com um atendente",
    "ATENDENTE por favor",
    "tem alguém humano aí?",
    "preciso falar com alguém",
    "vocês têm uma pessoa real?",
  ])("matches %j", (text) => {
    expect(detectHandoffIntent(text, keywords)).toBe(true);
  });

  it.each([
    "qual o preço?",
    "oi tudo bem",
    "não consigo entrar",
    "",
  ])("does not match %j", (text) => {
    expect(detectHandoffIntent(text, keywords)).toBe(false);
  });

  it("returns false when keyword list is empty", () => {
    expect(detectHandoffIntent("falar com atendente", [])).toBe(false);
  });

  it("ignores empty/whitespace-only keywords", () => {
    expect(detectHandoffIntent("oi", [" ", "", "  "])).toBe(false);
  });
});
