import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "chat-assistant" },
  // Defense-in-depth: even if a caller logs an error object that happens to
  // carry a secret in its message/stack, pino masks the most common fields.
  // We strip secrets at the source too (see channels/telegram/api.ts).
  redact: {
    paths: [
      "*.bot_token",
      "*.botToken",
      "*.apiKey",
      "*.api_key",
      "*.password",
      "*.authorization",
      "*.headers.authorization",
      "*.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  // Vercel captures stdout; in dev the user can pipe through pino-pretty.
});
