// AI Provider abstraction — swap GraniteAIProvider in when IBM credentials are available

export interface AIProvider {
  chat(messages: AIMessage[], systemPrompt?: string): Promise<string>;
  isAvailable(): boolean;
  providerName(): string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
