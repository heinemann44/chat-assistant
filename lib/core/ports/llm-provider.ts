import type { ConversationMessage } from "../types";

export type LLMRequest = {
  systemPrompt: string;
  messages: ConversationMessage[];
};

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<string>;
}
