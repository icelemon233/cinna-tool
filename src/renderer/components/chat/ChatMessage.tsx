import React from 'react';
import styled from '@emotion/styled';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../store/chatStore';

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
  background: ${({ isUser }) => (isUser ? '#f59e0b' : '#1e1e2a')};
  color: ${({ isUser }) => (isUser ? '#000' : '#e8e8f0')};
  border: ${({ isUser }) => (isUser ? 'none' : '1px solid #2a2a3d')};
`;

const Bubble = styled.div<{ isUser: boolean }>`
  background: ${({ isUser }) => (isUser ? '#1e2a3a' : '#1a1a26')};
  border: 1px solid ${({ isUser }) => (isUser ? '#2d4a6a' : '#2a2a3d')};
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.7;
  color: #e8e8f0;
  word-break: break-word;

  /* Markdown styles */
  p {
    margin: 0 0 8px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  code {
    background: #2a2a3d;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  pre {
    background: #0f0f14;
    border: 1px solid #2a2a3d;
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
    border-left: 3px solid #f59e0b;
    padding-left: 12px;
    margin: 8px 0;
    color: #8888a8;
  }

  a {
    color: #f59e0b;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 12px 0 8px 0;
    color: #e8e8f0;
  }
`;

const Timestamp = styled.span`
  font-size: 11px;
  color: #55556a;
  margin-top: 4px;
  display: block;
  text-align: ${(props: { isUser: boolean }) => (props.isUser ? 'right' : 'left')};
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
    background: #55556a;
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

  return (
    <div>
      <MessageContainer isUser={isUser}>
        <Avatar isUser={isUser}>{isUser ? 'U' : 'C'}</Avatar>
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
      </MessageContainer>
      <Timestamp isUser={isUser}>{formatTime(message.timestamp)}</Timestamp>
    </div>
  );
};

export default ChatMessage;
