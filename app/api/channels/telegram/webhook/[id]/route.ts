import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { TelegramAdapter } from "@/lib/channels/telegram/adapter";
import { parseTelegramUpdate } from "@/lib/channels/telegram/parse";
import { detectHandoffIntent } from "@/lib/core/handoff/detector";
import {
  buildOwnerNotification,
  HANDOFF_USER_ACK,
} from "@/lib/core/handoff/messages";
import { dispatchHandoffNotification } from "@/lib/core/handoff/notifier";
import { processMessage } from "@/lib/core/pipeline";
import {
  lastReplyWasRateLimitWarning,
  RATE_LIMIT_WARNING,
  shouldRateLimit,
} from "@/lib/core/rate-limit/limiter";
import type { ConversationMessage } from "@/lib/core/types";
import { DrizzleConfigRepo } from "@/lib/db/repos/config-repo";
import { DrizzleConversationRepo } from "@/lib/db/repos/conversation-repo";
import { DrizzleHandoffEventsRepo } from "@/lib/db/repos/handoff-events-repo";
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
    const handoffEventsRepo = new DrizzleHandoffEventsRepo();

    const [tone, llmConfig, faqs, handoffConfig, convo] = await Promise.all([
      configRepo.getTone(channel.tenantId),
      configRepo.getLlmConfig(channel.tenantId),
      configRepo.getActiveFaqs(channel.tenantId),
      configRepo.getHandoffConfig(channel.tenantId),
      conversationRepo.getOrCreate({
        tenantId: channel.tenantId,
        channelInstanceId: channel.id,
        externalUserId: parsed.incoming.externalUserId,
        externalUserName: parsed.incoming.externalUserName ?? null,
      }),
    ]);

    const adapter = new TelegramAdapter(token);
    const userMessage: ConversationMessage = {
      role: "user",
      text: parsed.incoming.text,
      at: parsed.incoming.receivedAt.toISOString(),
    };

    // Lazy auto-resume: if the cron didn't get there yet, do it here so the
    // current message is processed normally.
    let state = convo.state;
    if (state === "handoff_active") {
      const resumed = await conversationRepo.resumeIfExpired(convo.id);
      if (resumed) {
        log.info({ conversation_id: convo.id }, "handoff auto-resumed");
        state = "active";
      }
    }

    // Still in active handoff → bot is muted. Record the user message and bail.
    if (state === "handoff_active") {
      await conversationRepo.appendMessages({
        conversationId: convo.id,
        messages: [userMessage],
      });
      log.info({ conversation_id: convo.id }, "muted: handoff active");
      return NextResponse.json({ ok: true });
    }

    // Handoff trigger detection. Keyword-based, configured per tenant.
    if (detectHandoffIntent(parsed.incoming.text, handoffConfig.triggerKeywords)) {
      const handoffUntil = new Date(
        Date.now() + handoffConfig.autoResumeMinutes * 60_000,
      );
      await conversationRepo.startHandoff({ conversationId: convo.id, handoffUntil });
      await handoffEventsRepo.record({
        conversationId: convo.id,
        tenantId: channel.tenantId,
        reason: "trigger keyword matched",
      });

      const notif = buildOwnerNotification({
        externalUserName: parsed.incoming.externalUserName ?? null,
        externalUserId: parsed.incoming.externalUserId,
        reason: "Cliente solicitou atendimento humano",
        recentMessages: [...convo.recentMessages, userMessage],
        channelName: channel.name,
      });
      const dispatch = await dispatchHandoffNotification({
        config: handoffConfig,
        message: notif,
        channelAdapter: adapter,
        payload: {
          tenantId: channel.tenantId,
          channelInstanceId: channel.id,
          conversationId: convo.id,
          externalUserId: parsed.incoming.externalUserId,
          externalUserName: parsed.incoming.externalUserName ?? null,
        },
      });
      if (!dispatch.ok) {
        log.warn({ reason: dispatch.reason }, "handoff notification not delivered");
      }

      await adapter.sendMessage(parsed.incoming.externalUserId, HANDOFF_USER_ACK);
      await conversationRepo.appendMessages({
        conversationId: convo.id,
        messages: [
          userMessage,
          { role: "assistant", text: HANDOFF_USER_ACK, at: new Date().toISOString() },
        ],
      });

      log.info({ conversation_id: convo.id }, "handoff triggered");
      return NextResponse.json({ ok: true });
    }

    // Rate limit: 5 user messages in 10s = burst. Warn once per burst,
    // then silently drop until the burst ends. Handoff already ran above —
    // legitimate distress isn't blocked by this.
    if (shouldRateLimit(convo.recentMessages, parsed.incoming.receivedAt)) {
      const alreadyWarned = lastReplyWasRateLimitWarning(convo.recentMessages);
      const appended: ConversationMessage[] = [userMessage];
      if (!alreadyWarned) {
        await adapter.sendMessage(parsed.incoming.externalUserId, RATE_LIMIT_WARNING);
        appended.push({
          role: "assistant",
          text: RATE_LIMIT_WARNING,
          at: new Date().toISOString(),
        });
      }
      await conversationRepo.appendMessages({
        conversationId: convo.id,
        messages: appended,
      });
      log.info(
        { conversation_id: convo.id, warned: !alreadyWarned },
        "rate limited",
      );
      return NextResponse.json({ ok: true });
    }

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
          faqs,
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
      userMessage,
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
