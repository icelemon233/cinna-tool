import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from '../../i18n';

const InputArea = styled.div`
  padding: 16px 20px 24px;
  background: var(--bg-primary);
  width: 100%;
  box-sizing: border-box;
`;

const InputContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  transition: border-color 0.2s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

  &:focus-within {
    border-color: var(--accent);
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  resize: none;
  line-height: 1.6;
  max-height: 150px;
  min-height: 40px;
  overflow-y: auto;

  &::placeholder {
    color: var(--text-muted);
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 8px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModelIndicator = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-light);
    color: var(--accent);
  }
`;

const ModelDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TokenCount = styled.span`
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
`;

const SendButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    opacity: 0.85;
    transform: scale(1.05);
  }

  &:disabled {
    background: var(--border-color);
    color: var(--text-muted);
    cursor: not-allowed;
    transform: none;
  }
`;

const StopButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
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
  color: var(--text-muted);
  text-align: center;
  margin-top: 8px;
`;

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  currentModelName: string;
  onModelClick: () => void;
  tokenCount: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  disabled,
  currentModelName,
  onModelClick,
  tokenCount,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

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
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  return (
    <InputArea>
      <InputContainer>
        <InputWrapper>
          <TextArea
            ref={textareaRef}
            placeholder={t('chat.inputPlaceholder')}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Toolbar>
            <ToolbarLeft>
              <ModelIndicator onClick={onModelClick}>
                <ModelDot />
                {currentModelName} ▾
              </ModelIndicator>
            </ToolbarLeft>
            <ToolbarRight>
              <TokenCount>
                {tokenCount} chars
              </TokenCount>
              {isGenerating ? (
                <StopButton onClick={onStop} title={t('chat.stop')}>
                  ■
                </StopButton>
              ) : (
                <SendButton onClick={handleSend} disabled={!text.trim() || disabled}>
                  ↑
                </SendButton>
              )}
            </ToolbarRight>
          </Toolbar>
        </InputWrapper>
        <InputHint>{t('chat.sendHint')}</InputHint>
      </InputContainer>
    </InputArea>
  );
};

export default ChatInput;
