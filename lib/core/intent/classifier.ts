import type { Intent } from "../types";

// Trailing (?![\p{L}]) replaces \b so accented words like "olá" terminate
// correctly. ASCII \b breaks on a final non-word char (the accent), which
// surprisingly makes `\bolá\b` reject "olá".
const GREETING_PATTERNS: RegExp[] = [
  /^\s*(oi+|ol[áa]|opa|al[oô]|hey|hello|hi|e\s?a[ií])(?![\p{L}])/iu,
  /\b(bom\s+dia|boa\s+tarde|boa\s+noite)\b/iu,
];

export function classifyIntent(text: string): Intent {
  const normalized = text.trim();
  if (!normalized) return "outro";
  if (GREETING_PATTERNS.some((re) => re.test(normalized))) return "saudacao";
  return "outro";
}
