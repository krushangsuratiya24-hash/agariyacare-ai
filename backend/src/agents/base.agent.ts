// Base agent interface

import { AIMessage } from '../providers/ai/interface';
import { AgentType, ChatAction, Worker, HistoryMessage } from '../types';

export interface AgentContext {
  workerId?: string;
  worker?: Worker | null;
  conversationHistory?: HistoryMessage[];
  language?: 'en' | 'gu';
}

export interface AgentResponse {
  message: string;
  agentType: AgentType;
  actions?: ChatAction[];
  data?: unknown;
}

export interface Agent {
  type: AgentType;
  name: string;
  description: string;
  canHandle(intent: string, query: string): boolean;
  handle(query: string, context: AgentContext): Promise<AgentResponse>;
}

export function toAIMessages(history: HistoryMessage[]): AIMessage[] {
  return history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}
