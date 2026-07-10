import { streamChat, type ChatConfig, type ChatMessage as AIChatMessage } from '@/shared/services/aiService';
import type { Conversation } from './types';

type SetStreamPatch = (patch: {
  conversations?: Conversation[];
  isGenerating?: boolean;
}) => void;

const STREAM_FLUSH_INTERVAL_MS = 48;

interface StreamAssistantMessageOptions {
  config: ChatConfig;
  convId: string;
  getConversations: () => Conversation[];
  history: AIChatMessage[];
  setPatch: SetStreamPatch;
}

function appendToLastMessage(
  conversations: Conversation[],
  convId: string,
  chunk: string
): Conversation[] {
  const currentConv = conversations.find((conversation) => conversation.id === convId);
  if (!currentConv) return conversations;

  const messages = [...currentConv.messages];
  const lastIdx = messages.length - 1;
  messages[lastIdx] = { ...messages[lastIdx], content: messages[lastIdx].content + chunk };

  return conversations.map((conversation) =>
    conversation.id === convId ? { ...conversation, messages } : conversation
  );
}

function replaceLastMessage(
  conversations: Conversation[],
  convId: string,
  content: string
): Conversation[] {
  const currentConv = conversations.find((conversation) => conversation.id === convId);
  if (!currentConv) return conversations;

  const messages = [...currentConv.messages];
  const lastIdx = messages.length - 1;
  messages[lastIdx] = { ...messages[lastIdx], content };

  return conversations.map((conversation) =>
    conversation.id === convId ? { ...conversation, messages } : conversation
  );
}

export async function streamAssistantMessage({
  config,
  convId,
  getConversations,
  history,
  setPatch,
}: StreamAssistantMessageOptions): Promise<void> {
  let pendingChunk = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushPendingChunk = () => {
    if (!pendingChunk) return;

    const chunk = pendingChunk;
    pendingChunk = '';
    setPatch({
      conversations: appendToLastMessage(getConversations(), convId, chunk),
    });
  };

  const clearFlushTimer = () => {
    if (!flushTimer) return;
    clearTimeout(flushTimer);
    flushTimer = null;
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushPendingChunk();
    }, STREAM_FLUSH_INTERVAL_MS);
  };

  await streamChat(
    history,
    config,
    (chunk: string) => {
      pendingChunk += chunk;
      scheduleFlush();
    },
    () => {
      clearFlushTimer();
      flushPendingChunk();
      setPatch({ isGenerating: false });
    },
    (error: Error) => {
      clearFlushTimer();
      pendingChunk = '';
      setPatch({
        conversations: replaceLastMessage(
          getConversations(),
          convId,
          `⚠️ 请求失败: ${error.message}`
        ),
        isGenerating: false,
      });
    }
  );
}
