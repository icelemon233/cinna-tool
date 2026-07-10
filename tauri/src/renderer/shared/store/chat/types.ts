import type { ModelInfo } from '@/shared/types/platform';

export interface ChatSettings {
  modelId: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  chatName: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

export interface ChatSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  settings: ChatSettings;
  models: ModelInfo[];
  skills: ChatSkill[];
  skillsOpen: boolean;

  newConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  loadSettings: () => Promise<void>;
  loadModels: () => Promise<void>;
  setSkillsOpen: (open: boolean) => void;
  addSkill: (skill: Pick<ChatSkill, 'name' | 'description' | 'instructions'>) => void;
  updateSkill: (
    id: string,
    partial: Partial<Pick<ChatSkill, 'name' | 'description' | 'instructions' | 'enabled'>>
  ) => void;
  deleteSkill: (id: string) => void;
  toggleSkill: (id: string, enabled: boolean) => void;
}
