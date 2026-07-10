import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Tag, Typography, type InputRef } from 'antd';
import { ExperimentOutlined, PauseOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  currentModelName: string;
  onModelClick: () => void;
  conversationTokenCount: number;
  activeSkillNames: string[];
  onSkillsClick: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  disabled,
  currentModelName,
  onModelClick,
  conversationTokenCount,
  activeSkillNames,
  onSkillsClick,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<InputRef>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isGenerating) {
      inputRef.current?.focus();
    }
  }, [isGenerating]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const inputCharText = t('chat.inputChars').replace('{count}', String(text.length));
  const conversationTokenText = t('chat.conversationTokens').replace(
    '{count}',
    String(conversationTokenCount)
  );

  return (
    <div className="chat-input-area">
      <div className="chat-input-container">
        <div className="chat-input-surface">
          <div className="chat-input-textarea-slot">
            <Input.TextArea
              ref={inputRef}
              variant="borderless"
              placeholder={t('chat.inputPlaceholder')}
              autoSize={{ minRows: 3, maxRows: 8 }}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
          </div>
          {activeSkillNames.length > 0 && (
            <div className="chat-input-skill-strip">
              {activeSkillNames.slice(0, 3).map((skillName) => (
                <Tag key={skillName} icon={<ExperimentOutlined />} color="processing">
                  {skillName}
                </Tag>
              ))}
              {activeSkillNames.length > 3 && (
                <Tag>{t('chat.skills.more').replace('{count}', String(activeSkillNames.length - 3))}</Tag>
              )}
            </div>
          )}
          <div className="chat-input-toolbar">
            <div className="chat-input-toolbar-left">
              <Button className="chat-input-model-button" type="text" size="small" onClick={onModelClick}>
                <Tag icon={<RobotOutlined />} color="processing">
                  {currentModelName}
                </Tag>
              </Button>
              <Button className="chat-input-skill-button" type="text" size="small" onClick={onSkillsClick}>
                <Tag icon={<ExperimentOutlined />} color={activeSkillNames.length > 0 ? 'success' : 'default'}>
                  {t('chat.skills.short').replace('{count}', String(activeSkillNames.length))}
                </Tag>
              </Button>
            </div>
            <Space size={8}>
              <Typography.Text className="chat-input-toolbar-meta" type="secondary">
                {inputCharText}
              </Typography.Text>
              {isGenerating ? (
                <Button className="chat-input-send-button" danger icon={<PauseOutlined />} onClick={onStop} />
              ) : (
                <Button
                  className="chat-input-send-button"
                  type="text"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!text.trim() || disabled}
                />
              )}
            </Space>
          </div>
        </div>
        <div className="chat-input-stats">
          <Typography.Text type="secondary">{conversationTokenText}</Typography.Text>
          <Typography.Text type="secondary">{t('chat.sendHint')}</Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
