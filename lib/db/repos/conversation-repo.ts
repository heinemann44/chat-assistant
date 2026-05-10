import { and, eq } from "drizzle-orm";

import type {
  AppendMessagesInput,
  ConversationRepo,
  ConversationState,
  GetOrCreateInput,
} from "@/lib/core/ports/conversation-repo";
import type { ConversationMessage } from "@/lib/core/types";

import { db } from "../client";
import { conversations } from "../schema";

const DEFAULT_WINDOW = 20;

export class DrizzleConversationRepo implements ConversationRepo {
  async getOrCreate(input: GetOrCreateInput): Promise<ConversationState> {
    const existing = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.channelInstanceId, input.channelInstanceId),
        eq(conversations.externalUserId, input.externalUserId),
      ),
    });

    if (existing) {
      return toState(existing);
    }

    const [created] = await db
      .insert(conversations)
      .values({
        tenantId: input.tenantId,
        channelInstanceId: input.channelInstanceId,
        externalUserId: input.externalUserId,
        externalUserName: input.externalUserName ?? null,
      })
      .returning();

    if (!created) {
      throw new Error("failed to create conversation");
    }
    return toState(created);
  }

  async appendMessages({ conversationId, messages, windowSize = DEFAULT_WINDOW }: AppendMessagesInput): Promise<void> {
    const existing = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    if (!existing) {
      throw new Error("conversation not found");
    }
    const prior = (existing.lastMessages as unknown as ConversationMessage[]) ?? [];
    const combined = [...prior, ...messages].slice(-windowSize);

    await db
      .update(conversations)
      .set({ lastMessages: combined })
      .where(eq(conversations.id, conversationId));
  }
}

function toState(row: typeof conversations.$inferSelect): ConversationState {
  return {
    id: row.id,
    tenantId: row.tenantId,
    channelInstanceId: row.channelInstanceId,
    externalUserId: row.externalUserId,
    externalUserName: row.externalUserName,
    state: row.state as ConversationState["state"],
    handoffUntil: row.handoffUntil,
    recentMessages: (row.lastMessages as unknown as ConversationMessage[]) ?? [],
  };
}
