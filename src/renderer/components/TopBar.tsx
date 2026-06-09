import React, { useState, useRef } from 'react';
import styled from '@emotion/styled';
import { useSettingsStore, type ThemeType } from '../store/settingsStore';
import { useUserStore } from '../store/userStore';
import { useTranslation } from '../i18n';
import UserMenu from './UserMenu';
import logoBlack from '../../assets/logo_black.png';
import logoWhite from '../../assets/logo_white.png';

const Bar = styled.div`
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  background: var(--topbar-bg, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  user-select: none;
  color: var(--topbar-text);
  z-index: 10;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
`;

const LogoImg = styled.img`
  height: 30px;
  width: auto;
  display: block;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: var(--topbar-text);

  &:hover {
    background: var(--accent-light);
  }
`;

// Language button & dropdown
const LangButtonWrapper = styled.div`
  position: relative;
`;

const LangButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--topbar-text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: var(--btn-hover-bg);
    border-color: var(--accent);
  }
`;

const Dropdown = styled.div<{ visible: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 1000;
  min-width: 160px;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: translateY(${({ visible }) => (visible ? '0' : '-4px')});
  pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
  transition: opacity 0.15s ease, transform 0.15s ease;
`;

const DropdownOption = styled.button<{ selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: none;
  background: ${({ selected }) => (selected ? 'var(--accent-light)' : 'transparent')};
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--btn-hover-bg);
  }
`;

const CheckMark = styled.span<{ visible: boolean }>`
  width: 16px;
  font-size: 13px;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
`;

// Theme dropdown
const ThemeButtonWrapper = styled.div`
  position: relative;
`;

const ColorDot = styled.span<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ color }) => color};
  display: inline-block;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

// User button
const UserButtonWrapper = styled.div`
  position: relative;
`;

const UserAvatarButton = styled.button<{ loggedIn: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: ${({ loggedIn }) => (loggedIn ? 'var(--accent, #667eea)' : 'transparent')};
  color: ${({ loggedIn }) => (loggedIn ? '#ffffff' : 'var(--topbar-text)')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ loggedIn }) => (loggedIn ? '14px' : '18px')};
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ loggedIn }) => (loggedIn ? 'var(--accent, #5a6fe8)' : 'var(--accent-light)')};
  }
`;

interface ThemeOption {
  id: ThemeType;
  icon: string;
  label: string;
  color: string;
}

const themeOptions: ThemeOption[] = [
  { id: 'peach', icon: '🍑', label: 'Peach', color: '#FFDFD3' },
  { id: 'mint', icon: '🌿', label: 'Mint', color: '#D4F0F0' },
  { id: 'sakura', icon: '🌸', label: 'Sakura', color: '#FCEFF9' },
  { id: 'lavender', icon: '💜', label: 'Lavender', color: '#E2DFFF' },
  { id: 'lemon', icon: '🍋', label: 'Lemon', color: '#FFFACD' },
  { id: 'dark', icon: '🌙', label: 'Dark', color: '#1a1a1a' },
];

const TopBar: React.FC = () => {
  const { theme, language, setTheme, setLanguage } = useSettingsStore();
  const { isLoggedIn, username } = useUserStore();
  const { t } = useTranslation();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const langTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover handlers for language
  const handleLangEnter = () => {
    if (langTimeoutRef.current) clearTimeout(langTimeoutRef.current);
    setLangMenuOpen(true);
  };
  const handleLangLeave = () => {
    langTimeoutRef.current = setTimeout(() => setLangMenuOpen(false), 150);
  };

  // Hover handlers for theme
  const handleThemeEnter = () => {
    if (themeTimeoutRef.current) clearTimeout(themeTimeoutRef.current);
    setThemeMenuOpen(true);
  };
  const handleThemeLeave = () => {
    themeTimeoutRef.current = setTimeout(() => setThemeMenuOpen(false), 150);
  };

  const handleSelectLang = (lang: 'zh' | 'en') => {
    setLanguage(lang);
    setLangMenuOpen(false);
  };

  const handleSelectTheme = (selected: ThemeType) => {
    setTheme(selected);
    setThemeMenuOpen(false);
  };

  return (
    <Bar>
      {/* Left: Logo — switch based on theme */}
      <LeftSection>
        <LogoImg src={theme === 'dark' ? logoWhite : logoBlack} alt="CinnaTool" />
      </LeftSection>

      {/* Right: Controls */}
      <RightSection>
        {/* Language Switcher — hover mode */}
        <LangButtonWrapper onMouseEnter={handleLangEnter} onMouseLeave={handleLangLeave}>
          <LangButton>
            {language === 'zh' ? '🇨🇳 简体中文' : '🇺🇸 English'}
          </LangButton>
          <Dropdown visible={langMenuOpen}>
            <DropdownOption selected={language === 'zh'} onClick={() => handleSelectLang('zh')}>
              <CheckMark visible={language === 'zh'}>✓</CheckMark>
              🇨🇳 简体中文
            </DropdownOption>
            <DropdownOption selected={language === 'en'} onClick={() => handleSelectLang('en')}>
              <CheckMark visible={language === 'en'}>✓</CheckMark>
              🇺🇸 English
            </DropdownOption>
          </Dropdown>
        </LangButtonWrapper>

        {/* Theme Switcher — hover mode */}
        <ThemeButtonWrapper onMouseEnter={handleThemeEnter} onMouseLeave={handleThemeLeave}>
          <IconButton title={t('topbar.theme')}>
            🎨
          </IconButton>
          <Dropdown visible={themeMenuOpen}>
            {themeOptions.map((opt) => (
              <DropdownOption
                key={opt.id}
                selected={theme === opt.id}
                onClick={() => handleSelectTheme(opt.id)}
              >
                <CheckMark visible={theme === opt.id}>✓</CheckMark>
                <ColorDot color={opt.color} />
                {opt.label}
              </DropdownOption>
            ))}
          </Dropdown>
        </ThemeButtonWrapper>

        {/* User — click mode */}
        <UserButtonWrapper>
          <UserAvatarButton
            loggedIn={isLoggedIn}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            title={t('topbar.user')}
          >
            {isLoggedIn ? username.charAt(0).toUpperCase() : '👤'}
          </UserAvatarButton>
          {userMenuOpen && <UserMenu onClose={() => setUserMenuOpen(false)} />}
        </UserButtonWrapper>
      </RightSection>
    </Bar>
  );
};

export default TopBar;
