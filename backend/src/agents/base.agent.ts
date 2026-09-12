// Base agent interface

import { AIMessage } from '../providers/ai/interface';
import { AgentType, ChatMessage, ChatAction, Worker } from '../types';

export interface AgentContext {
  workerId?: string;
  worker?: Worker | null;
  conversationHistory?: ChatMessage[];
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

export function toAIMessages(history: ChatMessage[]): AIMessage[] {
  return history.map(m => ({ role: m.role, content: m.content }));
}
