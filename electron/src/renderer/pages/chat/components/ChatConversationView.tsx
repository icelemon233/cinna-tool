import type React from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { Message } from '@/shared/store/chatStore';

type ChatInputProps = React.ComponentProps<typeof ChatInput>;

interface ChatConversationViewProps {
  inputProps: ChatInputProps;
  isGenerating: boolean;
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatConversationView({
  inputProps,
  isGenerating,
  messages,
  messagesEndRef,
}: ChatConversationViewProps) {
  return (
    <>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isGenerating={isGenerating && index === messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput {...inputProps} />
    </>
  );
}
