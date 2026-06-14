import React, { useState } from 'react';
import {
  App,
  Button,
  Divider,
  Input,
  Space,
  Typography,
} from 'antd';
import {
  LoginOutlined,
  LogoutOutlined,
  MailOutlined,
  KeyOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import UserAvatar from '@/shared/components/user-avatar/UserAvatar';
import { useUserStore } from '@/shared/store/userStore';
import { useTranslation } from '@/shared/i18n';
import './UserMenu.css';

interface UserMenuProps {
  onClose: () => void;
  onOpenUserSettings: () => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose, onOpenUserSettings }) => {
  const { isLoggedIn, isAuthAvailable, isLoading, username, avatar, email, signIn, logout } = useUserStore();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = () => {
    if (!loginEmail.trim() || !loginPassword) return;
    signIn(loginEmail.trim(), loginPassword)
      .then(() => {
        setLoginPassword('');
      })
      .catch((error) => message.error(getErrorMessage(error)));
  };

  const handleLogout = () => {
    logout()
      .then(onClose)
      .catch((error) => message.error(getErrorMessage(error)));
  };

  const handleOpenUserSettings = () => {
    onOpenUserSettings();
    onClose();
  };

  if (!isLoggedIn) {
    return (
      <div className="user-menu-overlay" onClick={onClose}>
        <div className="user-menu-panel" onClick={(event) => event.stopPropagation()}>
          <Space className="user-menu-stack" orientation="vertical" size={12}>
            <Typography.Title className="user-menu-title user-menu-title--center" level={5}>
              {t('user.loginTitle')}
            </Typography.Title>
            <Input
              prefix={<MailOutlined />}
              placeholder={t('user.email')}
              value={loginEmail}
              disabled={!isAuthAvailable || isLoading}
              onChange={(event) => setLoginEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder={t('user.password')}
              value={loginPassword}
              disabled={!isAuthAvailable || isLoading}
              onChange={(event) => setLoginPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
            />
            <Button
              type="primary"
              block
              icon={<LoginOutlined />}
              loading={isLoading}
              onClick={handleLogin}
              disabled={!isAuthAvailable || !loginEmail.trim() || !loginPassword}
            >
              {t('user.login')}
            </Button>
            <Button type="text" block icon={<UserOutlined />} onClick={handleOpenUserSettings}>
              {isAuthAvailable ? t('user.signup') : t('settings.accountUnavailable')}
            </Button>
          </Space>
        </div>
      </div>
    );
  }

  return (
    <div className="user-menu-overlay" onClick={onClose}>
      <div className="user-menu-panel" onClick={(event) => event.stopPropagation()}>
        <div className="user-menu-header">
          <UserAvatar avatar={avatar} className="user-menu-avatar" size={42} username={username} />
          <div className="user-menu-info">
            <Typography.Text className="user-menu-line" strong title={username}>
              {username}
            </Typography.Text>
            {email && (
              <Typography.Text className="user-menu-line user-menu-line--small" type="secondary" title={email}>
                {email}
              </Typography.Text>
            )}
          </div>
        </div>

        <Divider className="user-menu-divider" />

        <Space className="user-menu-stack" orientation="vertical" size={4}>
          <Button
            className="user-menu-button"
            type="text"
            block
            icon={<SettingOutlined />}
            onClick={handleOpenUserSettings}
          >
            {t('user.accountSettings')}
          </Button>
        </Space>

        <Divider className="user-menu-divider--compact" />

        <Button
          className="user-menu-button"
          danger
          type="text"
          block
          icon={<LogoutOutlined />}
          loading={isLoading}
          onClick={handleLogout}
        >
          {t('user.logout')}
        </Button>
      </div>
    </div>
  );
};

export default UserMenu;
