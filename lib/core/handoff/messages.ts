import type { ConversationMessage } from "../types";

// Reply sent to the customer when handoff fires.
export const HANDOFF_USER_ACK =
  "Tudo bem, vou avisar a equipe e em instantes alguém retorna por aqui. " +
  "Enquanto isso, qualquer detalhe extra pode mandar — vou repassar.";

// Builds the message we send to the owner notification channel.
export function buildOwnerNotification(opts: {
  externalUserName: string | null;
  externalUserId: string;
  reason: string;
  recentMessages: ConversationMessage[];
  channelName: string;
}): string {
  const who = opts.externalUserName
    ? `${opts.externalUserName} (${opts.externalUserId})`
    : opts.externalUserId;
  const recent = opts.recentMessages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "👤" : "🤖"} ${truncate(m.text, 200)}`)
    .join("\n");
  return [
    `🆘 Handoff solicitado — ${opts.channelName}`,
    `De: ${who}`,
    `Motivo: ${opts.reason}`,
    "",
    "Últimas mensagens:",
    recent || "(nenhuma)",
  ].join("\n");
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
