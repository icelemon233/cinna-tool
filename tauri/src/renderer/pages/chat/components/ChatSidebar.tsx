import type React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { DeleteOutlined, MessageOutlined, PlusOutlined } from '@ant-design/icons';
import type { Conversation } from '@/shared/store/chatStore';

interface ChatSidebarProps {
  activeConversationId: string | null;
  conversations: Conversation[];
  displayTitle: (title: string) => string;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  onSwitchConversation: (id: string) => void;
  t: (key: string) => string;
  toolPanel: React.ReactNode;
}

export function ChatSidebar({
  activeConversationId,
  conversations,
  displayTitle,
  onDeleteConversation,
  onNewConversation,
  onSwitchConversation,
  t,
  toolPanel,
}: ChatSidebarProps) {
  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-header">
        <Button type="primary" block icon={<PlusOutlined />} onClick={onNewConversation}>
          {t('chat.newChat')}
        </Button>
      </div>

      <div className="chat-sidebar-section">
        <Typography.Text className="chat-section-title" type="secondary">
          {t('chat.recentChats')}
        </Typography.Text>
        <Space className="chat-conversation-list" orientation="vertical" size={4}>
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`chat-conversation-button${conversation.id === activeConversationId ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={displayTitle(conversation.title)}
              onClick={() => onSwitchConversation(conversation.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSwitchConversation(conversation.id);
                }
              }}
            >
              <MessageOutlined />
              <span className="chat-conversation-title">{displayTitle(conversation.title)}</span>
              <Tooltip title={t('chat.deleteChat')}>
                <Button
                  className="chat-conversation-delete"
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                />
              </Tooltip>
            </div>
          ))}
        </Space>
      </div>

      <div className="chat-sidebar-footer">{toolPanel}</div>
    </aside>
  );
}
