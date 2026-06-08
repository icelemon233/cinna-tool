import { create } from 'zustand';
import { streamChat, stopGeneration, type ChatMessage, type ChatConfig } from '../services/aiService';
import type { ModelInfo } from '../types/electron.d';

export interface ChatSettings {
  modelId: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  chatName: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  settings: ChatSettings;
  models: ModelInfo[];
  settingsOpen: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  loadSettings: () => Promise<void>;
  loadModels: () => Promise<void>;
  setSettingsOpen: (open: boolean) => void;
}

const defaultSettings: ChatSettings = {
  modelId: '',
  model: '',
  baseUrl: '',
  apiKey: '',
  chatName: '',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  settings: defaultSettings,
  models: [],
  settingsOpen: false,

  setSettingsOpen: (open: boolean) => {
    set({ settingsOpen: open });
  },

  loadModels: async () => {
    try {
      const models = await window.electronAPI.getModels();
      set({ models });
    } catch {
      // Models will be empty if electronAPI is not available
    }
  },

  loadSettings: async () => {
    try {
      const config = (await window.electronAPI.storeGet('config')) as ChatSettings | null;
      if (config && config.modelId) {
        set({ settings: config });
      }
    } catch {
      // Settings will remain default if electronAPI is not available
    }
  },

  updateSettings: (partial: Partial<ChatSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
    // Persist to electron store
    window.electronAPI.storeSet('config', updated).catch(() => {});
  },

  clearHistory: () => {
    set({ messages: [] });
  },

  stopGeneration: () => {
    stopGeneration();
    set({ isGenerating: false });
  },

  sendMessage: async (content: string) => {
    const { settings, messages, isGenerating } = get();
    if (isGenerating || !content.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isGenerating: true,
    });

    // Build conversation history for API
    const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const config: ChatConfig = {
      modelId: settings.modelId,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
    };

    await streamChat(
      history,
      config,
      // onChunk
      (chunk: string) => {
        const currentMessages = get().messages;
        const lastIdx = currentMessages.length - 1;
        const updated = [...currentMessages];
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: updated[lastIdx].content + chunk,
        };
        set({ messages: updated });
      },
      // onDone
      (_fullText: string) => {
        set({ isGenerating: false });
      },
      // onError
      (error: Error) => {
        const currentMessages = get().messages;
        const lastIdx = currentMessages.length - 1;
        const updated = [...currentMessages];
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: `⚠️ 请求失败: ${error.message}`,
        };
        set({ messages: updated, isGenerating: false });
      }
    );
  },
}));
