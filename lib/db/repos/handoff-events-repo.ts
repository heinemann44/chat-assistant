import type {
  HandoffEventsRepo,
  RecordHandoffInput,
} from "@/lib/core/ports/handoff-events-repo";

import { db } from "../client";
import { handoffEvents } from "../schema";

export class DrizzleHandoffEventsRepo implements HandoffEventsRepo {
  async record(input: RecordHandoffInput): Promise<{ id: string }> {
    const [row] = await db
      .insert(handoffEvents)
      .values({
        conversationId: input.conversationId,
        tenantId: input.tenantId,
        reason: input.reason,
      })
      .returning({ id: handoffEvents.id });
    if (!row) throw new Error("failed to record handoff event");
    return { id: row.id };
  }
}
