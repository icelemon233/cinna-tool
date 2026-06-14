import React from 'react';
import { App as AntdApp, Avatar, Button, Space, Typography } from 'antd';
import {
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  RedoOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/shared/i18n';
import { useChatStore, type Message } from '@/shared/store/chatStore';
import { useUserStore } from '@/shared/store/userStore';
import UserAvatar from '@/shared/components/user-avatar/UserAvatar';
import './ChatMessage.css';

interface ChatMessageProps {
  message: Message;
  isGenerating?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isGenerating }) => {
  const { message: messageApi } = AntdApp.useApp();
  const isUser = message.role === 'user';
  const showTyping = !isUser && isGenerating && !message.content;
  const { t } = useTranslation();
  const { username, avatar } = useUserStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      messageApi.success(t('chat.copied'));
    } catch {
      messageApi.warning(t('chat.copy'));
    }
  };

  const handleRegenerate = () => {
    useChatStore.getState().regenerateLastMessage();
  };
  const roleClassName = isUser ? 'is-user' : 'is-assistant';

  return (
    <div className={`chat-message ${roleClassName}`}>
      {isUser ? (
        <UserAvatar avatar={avatar} className="chat-message-avatar" username={username} />
      ) : (
        <Avatar className="chat-message-avatar" icon={<RobotOutlined />} />
      )}
      <div className="chat-message-body">
        <div className="chat-message-bubble">
          {showTyping ? (
            <div className="chat-message-typing">
              <span />
              <span />
              <span />
            </div>
          ) : isUser ? (
            <span className="chat-message-user-text">{message.content}</span>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>
        <Typography.Text className="chat-message-time" type="secondary">
          {formatTime(message.timestamp)}
        </Typography.Text>
        {!isUser && message.content && !isGenerating && (
          <Space size={2}>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={handleCopy}>
              {t('chat.copy')}
            </Button>
            <Button type="text" size="small" icon={<RedoOutlined />} onClick={handleRegenerate}>
              {t('chat.regenerate')}
            </Button>
            <Button type="text" size="small" icon={<LikeOutlined />} />
            <Button type="text" size="small" icon={<DislikeOutlined />} />
          </Space>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatMessage);
