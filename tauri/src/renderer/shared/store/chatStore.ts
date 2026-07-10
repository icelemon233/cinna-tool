import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { stopGeneration as stopGen } from '@/shared/services/aiService';
import {
  createConversation,
  createMessage,
  toApiHistory,
  updateConversationMessages,
} from './chat/conversations';
import { defaultSettings, getEffectiveChatConfig, normalizeSettings } from './chat/settings';
import { createSkill, touchEnabledSkills, updateSkillRecord } from './chat/skills';
import { streamAssistantMessage } from './chat/streaming';
import type { ChatSettings, ChatState, Message } from './chat/types';

export type {
  ChatSettings,
  ChatSkill,
  ChatState,
  Conversation,
  Message,
} from './chat/types';

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isGenerating: false,
      settings: defaultSettings,
      models: [],
      skills: [],
      skillsOpen: false,

      setSkillsOpen: (open: boolean) => {
        set({ skillsOpen: open });
      },

      addSkill: (skillInput) => {
        const skill = createSkill(skillInput);
        if (!skill) return;

        set((state) => ({
          skills: [skill, ...state.skills],
        }));
      },

      updateSkill: (id, partial) => {
        set((state) => ({
          skills: state.skills.map((skill) =>
            skill.id === id ? updateSkillRecord(skill, partial) : skill
          ),
        }));
      },

      deleteSkill: (id) => {
        set((state) => ({
          skills: state.skills.filter((skill) => skill.id !== id),
        }));
      },

      toggleSkill: (id, enabled) => {
        get().updateSkill(id, { enabled });
      },

      loadModels: async () => {
        try {
          const models = await window.cinnaAPI.getModels();
          set((state) => ({
            models,
            settings: normalizeSettings(state.settings, models),
          }));
        } catch {
          // Models will be empty if cinnaAPI is not available.
        }
      },

      loadSettings: async () => {
        try {
          const config = (await window.cinnaAPI.storeGet('config')) as ChatSettings | null;
          if (config && config.modelId) {
            set((state) => ({
              settings: normalizeSettings(config, state.models),
            }));
          }
        } catch {
          // Settings will remain default if cinnaAPI is not available.
        }
      },

      updateSettings: (partial: Partial<ChatSettings>) => {
        const current = get().settings;
        const updated = normalizeSettings({ ...current, ...partial }, get().models);
        set({ settings: updated });
        window.cinnaAPI.storeSet('config', updated).catch(() => {});
      },

      newConversation: () => {
        const newConv = createConversation();
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
          const filtered = state.conversations.filter((conversation) => conversation.id !== id);
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
        const { settings, conversations, activeConversationId, isGenerating, models, skills } = get();
        const trimmedContent = content.trim();
        if (isGenerating || !trimmedContent) return;

        let convId = activeConversationId;
        let convs = conversations;

        if (!convId) {
          const newConv = createConversation();
          convId = newConv.id;
          convs = [newConv, ...convs];
          set({ conversations: convs, activeConversationId: convId });
        }

        const conv = convs.find((conversation) => conversation.id === convId);
        if (!conv) return;

        const userMsg = createMessage('user', trimmedContent);
        const assistantMsg = createMessage('assistant', '');
        const updatedMessages = [...conv.messages, userMsg, assistantMsg];
        const title = conv.messages.length === 0 ? trimmedContent.slice(0, 20) : conv.title;
        const updatedConvs = updateConversationMessages(convs, convId, updatedMessages, title);

        set({
          conversations: updatedConvs,
          isGenerating: true,
          skills: touchEnabledSkills(skills),
        });

        await streamAssistantMessage({
          convId,
          history: toApiHistory([...conv.messages, userMsg]),
          config: getEffectiveChatConfig(settings, models, get().skills),
          getConversations: () => get().conversations,
          setPatch: set,
        });
      },

      regenerateLastMessage: async () => {
        const { settings, conversations, activeConversationId, isGenerating, models, skills } = get();
        if (isGenerating) return;

        const conv = conversations.find((conversation) => conversation.id === activeConversationId);
        if (!conv || conv.messages.length < 2) return;

        const messages = [...conv.messages];
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role !== 'assistant') return;

        messages.pop();
        const newAssistantMsg = createMessage('assistant', '');
        const updatedMessages: Message[] = [...messages, newAssistantMsg];
        const convId = activeConversationId!;

        set({
          conversations: updateConversationMessages(conversations, convId, updatedMessages),
          isGenerating: true,
          skills: touchEnabledSkills(skills),
        });

        await streamAssistantMessage({
          convId,
          history: toApiHistory(messages),
          config: getEffectiveChatConfig(settings, models, get().skills),
          getConversations: () => get().conversations,
          setPatch: set,
        });
      },
    }),
    {
      name: 'cinnatool-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        skills: state.skills,
      }),
    }
  )
);
