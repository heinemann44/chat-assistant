// Keyword-based handoff detection. Substring match on the user text after
// lowercasing both sides — covers stems like "atendente", "atendentes",
// "falar com alguém" without needing fancy stemming. Word boundaries are
// intentionally NOT enforced because Portuguese morphology (plural, gender)
// would force a richer rule set; the trade-off is occasional false positives
// on very short keywords, which the admin can fix by tuning the list.

export function detectHandoffIntent(text: string, triggerKeywords: string[]): boolean {
  if (!text || triggerKeywords.length === 0) return false;
  const normalized = text.toLowerCase();
  return triggerKeywords.some((k) => {
    const needle = k.trim().toLowerCase();
    if (!needle) return false;
    return normalized.includes(needle);
  });
}
