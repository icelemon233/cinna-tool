import React, { useState } from 'react';
import { Button } from 'antd';
import { SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useUserStore } from '@/shared/store/userStore';
import { useTranslation } from '@/shared/i18n';
import UserAvatar from '@/shared/components/user-avatar/UserAvatar';
import UserMenu from '@/shared/components/user-menu/UserMenu';
import logoBlack from '@assets/logo_black.png';
import logoWhite from '@assets/logo_white.png';
import './TopBar.css';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenUserSettings: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onOpenSettings, onOpenUserSettings }) => {
  const { theme } = useSettingsStore();
  const { isLoggedIn, username, avatar } = useUserStore();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isDarkTheme = theme === 'dark';

  return (
    <header className="topbar">
      <div className="topbar-row">
        <img
          className={`topbar-logo${isDarkTheme ? ' is-dark' : ''}`}
          src={isDarkTheme ? logoWhite : logoBlack}
          alt="CinnaTool"
        />

        <div className="topbar-actions">
          <Button
            className="topbar-action-button"
            aria-label={t('nav.settings')}
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
          />

          <div className="topbar-user-button">
            <Button
              className="topbar-action-button"
              type={isLoggedIn ? 'primary' : 'default'}
              aria-label={t('topbar.user')}
              icon={isLoggedIn
                ? <UserAvatar avatar={avatar} className="topbar-avatar" size={28} username={username} />
                : <UserOutlined />}
              onClick={() => setUserMenuOpen((open) => !open)}
            />
            {userMenuOpen && (
              <UserMenu
                onClose={() => setUserMenuOpen(false)}
                onOpenUserSettings={onOpenUserSettings}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
