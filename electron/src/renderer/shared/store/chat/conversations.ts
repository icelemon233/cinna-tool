import type { ChatMessage as AIChatMessage } from '@/shared/services/aiService';
import { generateId } from './ids';
import type { Conversation, Message } from './types';

export function createConversation(): Conversation {
  return {
    id: generateId(),
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createMessage(role: Message['role'], content: string): Message {
  return {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };
}

export function toApiHistory(messages: Message[]): AIChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export function updateConversationMessages(
  conversations: Conversation[],
  convId: string,
  messages: Message[],
  title?: string
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === convId
      ? {
          ...conversation,
          messages,
          title: title ?? conversation.title,
          updatedAt: Date.now(),
        }
      : conversation
  );
}
