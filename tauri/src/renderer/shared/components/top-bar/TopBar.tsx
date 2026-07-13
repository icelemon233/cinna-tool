import React from 'react';
import { Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useTranslation } from '@/shared/i18n';
import logoBlack from '@assets/logo_black.png';
import logoWhite from '@assets/logo_white.png';
import './TopBar.css';

interface TopBarProps {
  onOpenSettings: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onOpenSettings }) => {
  const { theme } = useSettingsStore();
  const { t } = useTranslation();
  const isDarkTheme = theme === 'dark';

  return (
    <header className="topbar">
      <div className="topbar-row" data-tauri-drag-region="deep">
        <img
          className={`topbar-logo${isDarkTheme ? ' is-dark' : ''}`}
          src={isDarkTheme ? logoWhite : logoBlack}
          alt="CinnaTool"
        />

        <div className="topbar-actions" data-tauri-drag-region="false">
          <Button
            className="topbar-action-button"
            aria-label={t('nav.settings')}
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
          />

        </div>
      </div>
    </header>
  );
};

export default TopBar;
