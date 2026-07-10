import { Button, Space, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type React from 'react';
import { useSettingsStore } from '@/shared/store/settingsStore';
import ChatInput from './ChatInput';
import logoBlack from '@assets/logo_black.png';
import logoWhite from '@assets/logo_white.png';

type ChatInputProps = React.ComponentProps<typeof ChatInput>;

interface ChatWelcomeProps {
  greeting: string;
  inputProps: ChatInputProps;
  isConfigured: boolean;
  onOpenSettings: () => void;
  t: (key: string) => string;
}

export function ChatWelcome({
  greeting,
  inputProps,
  isConfigured,
  onOpenSettings,
  t,
}: ChatWelcomeProps) {
  const { theme } = useSettingsStore();
  const logo = theme === 'dark' ? logoWhite : logoBlack;

  if (!isConfigured) {
    return (
      <div className="chat-welcome">
        <div className="chat-welcome-inner">
          <div className="chat-welcome-content">
            <img className="chat-welcome-logo" src={logo} alt="CinnaTool" />
            <Space className="chat-welcome-copy" orientation="vertical" size={4}>
              <Typography.Title className="chat-welcome-title" level={2}>
                {greeting}
              </Typography.Title>
              <Typography.Text type="secondary">{t('chat.welcomeDesc')}</Typography.Text>
            </Space>
            <Button type="primary" icon={<SettingOutlined />} onClick={onOpenSettings}>
              {t('chat.goSettings')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-welcome">
      <div className="chat-welcome-inner">
        <Space className="chat-welcome-stack" orientation="vertical" size={20}>
          <div className="chat-welcome-content">
            <img className="chat-welcome-logo" src={logo} alt="CinnaTool" />
            <Space className="chat-welcome-copy" orientation="vertical" size={2}>
              <Typography.Title className="chat-welcome-title" level={2}>
                {greeting}
              </Typography.Title>
            </Space>
          </div>
          <ChatInput {...inputProps} />
        </Space>
      </div>
    </div>
  );
}
