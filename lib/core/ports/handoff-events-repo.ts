export type RecordHandoffInput = {
  conversationId: string;
  tenantId: string;
  reason: string;
};

export interface HandoffEventsRepo {
  record(input: RecordHandoffInput): Promise<{ id: string }>;
}
