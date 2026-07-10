export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatConfig {
  modelId: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export type OnChunkCallback = (chunk: string) => void;
export type OnDoneCallback = (fullText: string) => void;
export type OnErrorCallback = (error: Error) => void;
