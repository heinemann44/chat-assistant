import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { TelegramAdapter } from "@/lib/channels/telegram/adapter";
import { parseTelegramUpdate } from "@/lib/channels/telegram/parse";
import { processMessage } from "@/lib/core/pipeline";
import type { ConversationMessage } from "@/lib/core/types";
import { DrizzleConfigRepo } from "@/lib/db/repos/config-repo";
import { DrizzleConversationRepo } from "@/lib/db/repos/conversation-repo";
import { getDecryptedSecret } from "@/lib/db/vault";
import { createLLMProvider } from "@/lib/llm/factory";
import { logger } from "@/lib/logger";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Telegram retries on non-2xx, so we almost always return 200 — even on
// expected failures like unknown channels or ignored payloads. Only the
// secret-mismatch case returns 401 to make probing visible in logs.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const log = logger.child({ route: "telegram_webhook", channel_instance_id: id });

  try {
    const configRepo = new DrizzleConfigRepo();
    const channel = await configRepo.getChannelInstanceById(id);
    if (!channel || channel.type !== "telegram" || !channel.enabled) {
      log.warn("channel not found or disabled");
      return NextResponse.json({ ok: false });
    }

    const headerSecret = request.headers.get(TELEGRAM_SECRET_HEADER) ?? "";
    if (!secretsEqual(headerSecret, channel.webhookSecret)) {
      log.warn("webhook secret mismatch");
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (!channel.botTokenSecretId) {
      log.error("channel has no bot_token_secret_id");
      return NextResponse.json({ ok: false });
    }
    const token = await getDecryptedSecret(channel.botTokenSecretId);
    if (!token) {
      log.error("vault secret missing");
      return NextResponse.json({ ok: false });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = parseTelegramUpdate(body);
    if (parsed.kind !== "message") {
      log.info({ reason: parsed.reason }, "ignored update");
      return NextResponse.json({ ok: true });
    }

    const conversationRepo = new DrizzleConversationRepo();
    const [tone, llmConfig, convo] = await Promise.all([
      configRepo.getTone(channel.tenantId),
      configRepo.getLlmConfig(channel.tenantId),
      conversationRepo.getOrCreate({
        tenantId: channel.tenantId,
        channelInstanceId: channel.id,
        externalUserId: parsed.incoming.externalUserId,
        externalUserName: parsed.incoming.externalUserName ?? null,
      }),
    ]);

    const adapter = new TelegramAdapter(token);
    const llm = await createLLMProvider(llmConfig);

    let result;
    try {
      result = await processMessage(
        {
          incoming: {
            channel: "telegram",
            channelInstanceId: channel.id,
            externalUserId: parsed.incoming.externalUserId,
            externalUserName: parsed.incoming.externalUserName,
            text: parsed.incoming.text,
            receivedAt: parsed.incoming.receivedAt,
          },
          tone,
          systemExtras: llmConfig.systemExtras,
          history: convo.recentMessages,
        },
        { llm },
      );
    } catch (err) {
      log.error({ err, provider: llm.name }, "LLM call failed; sending fallback");
      await adapter
        .sendMessage(
          parsed.incoming.externalUserId,
          "Desculpe, estou com problemas técnicos no momento. Tente novamente em alguns minutos.",
        )
        .catch((sendErr) => log.error({ err: sendErr }, "fallback sendMessage also failed"));
      return NextResponse.json({ ok: false });
    }

    for (const reply of result.replies) {
      await adapter.sendMessage(parsed.incoming.externalUserId, reply.text);
    }

    const turnNow = new Date().toISOString();
    const appended: ConversationMessage[] = [
      {
        role: "user",
        text: parsed.incoming.text,
        at: parsed.incoming.receivedAt.toISOString(),
      },
      ...result.replies.map<ConversationMessage>((r) => ({
        role: "assistant",
        text: r.text,
        at: turnNow,
      })),
    ];
    await conversationRepo.appendMessages({
      conversationId: convo.id,
      messages: appended,
    });

    log.info({ intent: result.intent, replies: result.replies.length }, "processed message");
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, "webhook handler crashed");
    return NextResponse.json({ ok: false });
  }
}

function secretsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
