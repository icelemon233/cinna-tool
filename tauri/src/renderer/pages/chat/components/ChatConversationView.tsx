import type React from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { Message } from '@/shared/store/chatStore';

type ChatInputProps = React.ComponentProps<typeof ChatInput>;

interface ChatConversationViewProps {
  inputProps: ChatInputProps;
  isGenerating: boolean;
  messages: Message[];
  messagesRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatConversationView({
  inputProps,
  isGenerating,
  messages,
  messagesRef,
}: ChatConversationViewProps) {
  return (
    <>
      <div className="chat-messages" ref={messagesRef}>
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isGenerating={isGenerating && index === messages.length - 1}
          />
        ))}
      </div>
      <ChatInput {...inputProps} />
    </>
  );
}
