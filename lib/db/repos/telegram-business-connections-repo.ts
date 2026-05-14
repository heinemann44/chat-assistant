import { eq } from "drizzle-orm";

import { db } from "../client";
import { telegramBusinessConnections } from "../schema";

export type BusinessConnectionUpsert = {
  tenantId: string;
  channelInstanceId: string;
  businessConnectionId: string;
  ownerUserId: number;
  ownerUsername: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  userChatId: number | null;
  canReply: boolean;
  canRead: boolean;
  isEnabled: boolean;
  connectedAt: Date;
};

export type BusinessConnectionRow = typeof telegramBusinessConnections.$inferSelect;

export class TelegramBusinessConnectionsRepo {
  async upsert(input: BusinessConnectionUpsert): Promise<BusinessConnectionRow> {
    const disconnectedAt = input.isEnabled ? null : new Date();

    const [row] = await db
      .insert(telegramBusinessConnections)
      .values({
        tenantId: input.tenantId,
        channelInstanceId: input.channelInstanceId,
        businessConnectionId: input.businessConnectionId,
        ownerUserId: input.ownerUserId,
        ownerUsername: input.ownerUsername,
        ownerFirstName: input.ownerFirstName,
        ownerLastName: input.ownerLastName,
        canReply: input.canReply,
        canRead: input.canRead,
        isEnabled: input.isEnabled,
        connectedAt: input.connectedAt,
        disconnectedAt,
      })
      .onConflictDoUpdate({
        target: telegramBusinessConnections.businessConnectionId,
        set: {
          ownerUsername: input.ownerUsername,
          ownerFirstName: input.ownerFirstName,
          ownerLastName: input.ownerLastName,
          canReply: input.canReply,
          canRead: input.canRead,
          isEnabled: input.isEnabled,
          disconnectedAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) {
      throw new Error("failed to upsert telegram business connection");
    }
    return row;
  }

  async findByConnectionId(businessConnectionId: string): Promise<BusinessConnectionRow | null> {
    const row = await db.query.telegramBusinessConnections.findFirst({
      where: eq(telegramBusinessConnections.businessConnectionId, businessConnectionId),
    });
    return row ?? null;
  }

  async listByChannelInstance(channelInstanceId: string): Promise<BusinessConnectionRow[]> {
    return db.query.telegramBusinessConnections.findMany({
      where: eq(telegramBusinessConnections.channelInstanceId, channelInstanceId),
    });
  }
}
