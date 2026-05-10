import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "chat-assistant" },
  // Vercel captures stdout; in dev the user can pipe through pino-pretty.
});
