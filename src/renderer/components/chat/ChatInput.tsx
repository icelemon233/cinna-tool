import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';

const InputArea = styled.div`
  padding: 12px 24px 20px;
  border-top: 1px solid #2a2a3d;
  background: #0f0f14;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #1e1e2a;
  border: 1px solid #2a2a3d;
  border-radius: 12px;
  padding: 10px 12px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #f59e0b;
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e8e8f0;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  resize: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;

  &::placeholder {
    color: #55556a;
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #2a2a3d;
    border-radius: 2px;
  }
`;

const SendButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #f59e0b;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #000;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #fbbf24;
    transform: scale(1.05);
  }

  &:disabled {
    background: #252536;
    color: #55556a;
    cursor: not-allowed;
    transform: none;
  }
`;

const StopButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #ef4444;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #f87171;
    transform: scale(1.05);
  }
`;

const InputHint = styled.div`
  font-size: 11px;
  color: #55556a;
  text-align: center;
  margin-top: 6px;
`;

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isGenerating, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <InputArea>
      <InputWrapper>
        <TextArea
          ref={textareaRef}
          placeholder="输入消息..."
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {isGenerating ? (
          <StopButton onClick={onStop} title="停止生成">
            ■
          </StopButton>
        ) : (
          <SendButton onClick={handleSend} disabled={!text.trim() || disabled}>
            ▲
          </SendButton>
        )}
      </InputWrapper>
      <InputHint>Enter 发送，Shift+Enter 换行</InputHint>
    </InputArea>
  );
};

export default ChatInput;
