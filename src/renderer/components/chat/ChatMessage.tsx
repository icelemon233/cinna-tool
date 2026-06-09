import React, { useState } from 'react';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../../i18n';
import { useChatStore, type Message } from '../../store/chatStore';

const MessageContainer = styled.div<{ isUser: boolean }>`
  display: flex;
  gap: 12px;
  max-width: 85%;
  align-self: ${({ isUser }) => (isUser ? 'flex-end' : 'flex-start')};
  flex-direction: ${({ isUser }) => (isUser ? 'row-reverse' : 'row')};
  animation: msgIn 0.25s ease;

  @keyframes msgIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Avatar = styled.div<{ isUser: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({ isUser }) => (isUser ? 'var(--accent)' : 'var(--bg-secondary)')};
  color: ${({ isUser }) => (isUser ? '#fff' : 'var(--text-primary)')};
  border: 1px solid var(--border-color);
`;

const BubbleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Bubble = styled.div<{ isUser: boolean }>`
  background: ${({ isUser }) => (isUser ? 'var(--accent-light)' : 'var(--bg-card)')};
  border: 1px solid ${({ isUser }) => (isUser ? 'transparent' : 'var(--border-color)')};
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;

  /* Markdown styles */
  p {
    margin: 0 0 8px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  code {
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  pre {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  blockquote {
    border-left: 3px solid var(--accent);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--text-secondary);
  }

  a {
    color: var(--accent);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 12px 0 8px 0;
    color: var(--text-primary);
  }
`;

const Timestamp = styled.span<{ isUser: boolean }>`
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  text-align: ${({ isUser }) => (isUser ? 'right' : 'left')};
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
`;

const ActionButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ active }) => (active ? 'var(--accent)' : 'var(--text-muted)')};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-light);
    color: var(--accent);
  }
`;

const ActionDivider = styled.span`
  width: 1px;
  height: 14px;
  background: var(--border-color);
  margin: 0 2px;
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: bounce 1.2s infinite;

    &:nth-of-type(2) {
      animation-delay: 0.15s;
    }
    &:nth-of-type(3) {
      animation-delay: 0.3s;
    }
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    40% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }
`;

const CopiedToast = styled.span`
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
  margin-left: 4px;
`;

interface ChatMessageProps {
  message: Message;
  isGenerating?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isGenerating }) => {
  const isUser = message.role === 'user';
  const showTyping = !isUser && isGenerating && !message.content;
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const handleRegenerate = () => {
    useChatStore.getState().regenerateLastMessage();
  };

  return (
    <MessageContainer isUser={isUser}>
      <Avatar isUser={isUser}>{isUser ? 'U' : 'AI'}</Avatar>
      <BubbleWrapper>
        <Bubble isUser={isUser}>
          {showTyping ? (
            <TypingIndicator>
              <span />
              <span />
              <span />
            </TypingIndicator>
          ) : isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </Bubble>
        <Timestamp isUser={isUser}>{formatTime(message.timestamp)}</Timestamp>
        {!isUser && message.content && !isGenerating && (
          <ActionBar>
            <ActionButton onClick={handleCopy}>
              📋 {t('chat.copy')}
              {copied && <CopiedToast>✓</CopiedToast>}
            </ActionButton>
            <ActionDivider />
            <ActionButton onClick={handleRegenerate}>
              🔄 {t('chat.regenerate')}
            </ActionButton>
            <ActionDivider />
            <ActionButton>
              👍
            </ActionButton>
            <ActionButton>
              👎
            </ActionButton>
          </ActionBar>
        )}
      </BubbleWrapper>
    </MessageContainer>
  );
};

export default ChatMessage;
