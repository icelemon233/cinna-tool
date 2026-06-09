import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { streamChat, stopGeneration as stopGen, type ChatMessage as AIChatMessage, type ChatConfig } from '../services/aiService';
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

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  settings: ChatSettings;
  models: ModelInfo[];
  settingsOpen: boolean;

  // Actions
  newConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  stopGeneration: () => void;
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

// @ts-ignore - reserved for future multi-conversation support
function _getConversationTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  return firstUser ? firstUser.content.slice(0, 20) : '新对话';
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
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
        window.electronAPI.storeSet('config', updated).catch(() => {});
      },

      newConversation: () => {
        const newConv: Conversation = {
          id: generateId(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: newConv.id,
        }));
      },

      switchConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          let activeId = state.activeConversationId;
          if (activeId === id) {
            activeId = filtered.length > 0 ? filtered[0].id : null;
          }
          return { conversations: filtered, activeConversationId: activeId };
        });
      },

      stopGeneration: () => {
        stopGen();
        set({ isGenerating: false });
      },

      sendMessage: async (content: string) => {
        const { settings, conversations, activeConversationId, isGenerating } = get();
        if (isGenerating || !content.trim()) return;

        let convId = activeConversationId;
        let convs = conversations;

        // If no active conversation, create one
        if (!convId) {
          const newConv: Conversation = {
            id: generateId(),
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          convId = newConv.id;
          convs = [newConv, ...convs];
          set({ conversations: convs, activeConversationId: convId });
        }

        const conv = convs.find((c) => c.id === convId)!;

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

        const updatedMessages = [...conv.messages, userMsg, assistantMsg];
        const title = conv.messages.length === 0 ? content.trim().slice(0, 20) : conv.title;

        const updatedConvs = convs.map((c) =>
          c.id === convId
            ? { ...c, messages: updatedMessages, title, updatedAt: Date.now() }
            : c
        );

        set({ conversations: updatedConvs, isGenerating: true });

        // Build conversation history for API
        const history: AIChatMessage[] = [...conv.messages, userMsg].map((m) => ({
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
          (chunk: string) => {
            const currentConvs = get().conversations;
            const currentConv = currentConvs.find((c) => c.id === convId);
            if (!currentConv) return;
            const msgs = [...currentConv.messages];
            const lastIdx = msgs.length - 1;
            msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + chunk };
            set({
              conversations: currentConvs.map((c) =>
                c.id === convId ? { ...c, messages: msgs } : c
              ),
            });
          },
          (_fullText: string) => {
            set({ isGenerating: false });
          },
          (error: Error) => {
            const currentConvs = get().conversations;
            const currentConv = currentConvs.find((c) => c.id === convId);
            if (!currentConv) return;
            const msgs = [...currentConv.messages];
            const lastIdx = msgs.length - 1;
            msgs[lastIdx] = { ...msgs[lastIdx], content: `⚠️ 请求失败: ${error.message}` };
            set({
              conversations: currentConvs.map((c) =>
                c.id === convId ? { ...c, messages: msgs } : c
              ),
              isGenerating: false,
            });
          }
        );
      },

      regenerateLastMessage: async () => {
        const { settings, conversations, activeConversationId, isGenerating } = get();
        if (isGenerating) return;

        const conv = conversations.find((c) => c.id === activeConversationId);
        if (!conv || conv.messages.length < 2) return;

        // Remove last assistant message
        const msgs = [...conv.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.role !== 'assistant') return;

        msgs.pop(); // remove old assistant message

        // Add new empty assistant message
        const newAssistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };
        const updatedMessages = [...msgs, newAssistantMsg];

        const convId = activeConversationId!;
        set({
          conversations: conversations.map((c) =>
            c.id === convId ? { ...c, messages: updatedMessages, updatedAt: Date.now() } : c
          ),
          isGenerating: true,
        });

        // Build history (all messages except the new empty assistant)
        const history: AIChatMessage[] = msgs.map((m) => ({
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
          (chunk: string) => {
            const currentConvs = get().conversations;
            const currentConv = currentConvs.find((c) => c.id === convId);
            if (!currentConv) return;
            const currentMsgs = [...currentConv.messages];
            const lastIdx = currentMsgs.length - 1;
            currentMsgs[lastIdx] = { ...currentMsgs[lastIdx], content: currentMsgs[lastIdx].content + chunk };
            set({
              conversations: currentConvs.map((c) =>
                c.id === convId ? { ...c, messages: currentMsgs } : c
              ),
            });
          },
          (_fullText: string) => {
            set({ isGenerating: false });
          },
          (error: Error) => {
            const currentConvs = get().conversations;
            const currentConv = currentConvs.find((c) => c.id === convId);
            if (!currentConv) return;
            const currentMsgs = [...currentConv.messages];
            const lastIdx = currentMsgs.length - 1;
            currentMsgs[lastIdx] = { ...currentMsgs[lastIdx], content: `⚠️ 请求失败: ${error.message}` };
            set({
              conversations: currentConvs.map((c) =>
                c.id === convId ? { ...c, messages: currentMsgs } : c
              ),
              isGenerating: false,
            });
          }
        );
      },
    }),
    {
      name: 'cinnatool-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
