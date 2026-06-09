import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { TopBar } from './components';
import { ChatPage } from './components/chat';
import { TodoPage } from './components/todo';
import { useSettingsStore } from './store/settingsStore';
import { useTranslation } from './i18n';

type Page = 'todo' | 'chat';

// ============================================
// Layout: TopBar (full width) + MainArea (Sidebar + Content)
// ============================================

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 0;
`;

// ============================================
// Left Sidebar (responsive via media query)
// ============================================

const Sidebar = styled.aside`
  width: 200px;
  background: var(--sidebar-bg, #1e293b);
  border-right: 1px solid var(--border-color, #2a2a3d);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex-shrink: 0;
  padding: 12px 0;
  gap: 4px;
  transition: width 0.2s ease;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 64px;
    align-items: center;
  }
`;

const NavItem = styled.button<{ active: boolean }>`
  width: calc(100% - 16px);
  height: 44px;
  border-radius: 12px;
  border: none;
  background: ${({ active }) => (active ? 'var(--sidebar-active-bg, rgba(102, 126, 234, 0.15))' : 'transparent')};
  color: var(--sidebar-text, #e8e8f0);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 16px;
  margin: 2px 8px;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: var(--sidebar-active-bg, rgba(102, 126, 234, 0.1));
  }

  @media (max-width: 768px) {
    width: 44px;
    padding: 0;
    margin: 2px 0;
    justify-content: center;
    gap: 0;
    font-size: 20px;
  }
`;

const NavIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NavLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Tooltip = styled.span`
  position: absolute;
  left: 58px;
  top: 50%;
  transform: translateY(-50%);
  background: #2a2a3d;
  color: #e8e8f0;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: none;

  @media (max-width: 768px) {
    display: block;

    ${NavItem}:hover & {
      opacity: 1;
    }
  }
`;

// ============================================
// Content Area
// ============================================

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: var(--bg-primary);
  transition: background 0.3s ease;
`;

// ============================================
// Page Wrappers
// ============================================

const PageWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

// ============================================
// App Component
// ============================================

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('todo');
  const { theme } = useSettingsStore();
  const { t } = useTranslation();

  // Sync data-theme attribute on document root for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <AppContainer data-theme={theme}>
      {/* TopBar — full width, top of window */}
      <TopBar />

      {/* MainArea — Sidebar + Content side by side */}
      <MainArea>
        <Sidebar>
          <NavItem active={page === 'todo'} onClick={() => setPage('todo')}>
            <NavIcon>📋</NavIcon>
            <NavLabel>{t('nav.todo')}</NavLabel>
            <Tooltip>{t('nav.todo')}</Tooltip>
          </NavItem>
          <NavItem active={page === 'chat'} onClick={() => setPage('chat')}>
            <NavIcon>💬</NavIcon>
            <NavLabel>{t('nav.chat')}</NavLabel>
            <Tooltip>{t('nav.chat')}</Tooltip>
          </NavItem>
        </Sidebar>

        <ContentArea>
          {page === 'todo' ? (
            <PageWrapper>
              <TodoPage />
            </PageWrapper>
          ) : (
            <PageWrapper>
              <ChatPage />
            </PageWrapper>
          )}
        </ContentArea>
      </MainArea>
    </AppContainer>
  );
};

export default App;
