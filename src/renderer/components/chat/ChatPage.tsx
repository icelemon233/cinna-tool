import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from '../../i18n';
import { queryBalance, type BalanceResponse } from '../../services/aiService';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSettingsPanel from './ChatSettings';

const PageContainer = styled.div`
  display: flex;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
`;

const Sidebar = styled.aside`
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  padding: 20px 16px 12px;
`;

const NewChatButton = styled.button`
  width: 100%;
  padding: 12px 16px;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const SidebarSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 8px 6px;
`;

const ChatHistoryItem = styled.button<{ active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ active }) => (active ? 'var(--accent-light)' : 'transparent')};
  color: ${({ active }) => (active ? 'var(--accent)' : 'var(--text-primary)')};
  font-size: 13px;
  font-weight: ${({ active }) => (active ? 500 : 400)};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: var(--accent-light);
  }

  &:hover .delete-btn {
    opacity: 1;
  }
`;

const ChatItemIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

const ChatItemTitle = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteChatBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: #e53e3e;
  }
`;

const SidebarFooter = styled.div`
  padding: 12px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BalanceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border-radius: 6px;
  border: 1px solid var(--border-color);
`;

const BalanceText = styled.span`
  font-weight: 500;
`;

const RefreshBalanceBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    color: var(--accent);
    background: var(--accent-light);
  }
`;

const SettingsButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:hover {
    background: var(--accent-light);
    color: var(--text-primary);
    border-color: var(--accent);
  }
`;

const MainArea = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
`;

const WelcomePage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px;
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`;

const WelcomeSubtitle = styled.p`
  font-size: 15px;
  color: var(--text-muted);
  margin: 0;
  max-width: 400px;
`;

const WelcomeButton = styled.button`
  padding: 12px 32px;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const ChatPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    isGenerating,
    settings,
    models,
    settingsOpen,
    newConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    updateSettings,
    loadSettings,
    loadModels,
    setSettingsOpen,
  } = useChatStore();

  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadSettings();
  }, [loadModels, loadSettings]);

  // Query balance when settings are available
  useEffect(() => {
    if (settings.apiKey && settings.baseUrl) {
      fetchBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.apiKey, settings.baseUrl]);

  const fetchBalance = async () => {
    if (!settings.apiKey || !settings.baseUrl) return;
    try {
      const res: BalanceResponse = await queryBalance(settings.baseUrl, settings.apiKey);
      if (res.balance_infos && res.balance_infos.length > 0) {
        const info = res.balance_infos[0];
        const symbol = info.currency === 'CNY' ? '¥' : '$';
        setBalance(`${symbol}${parseFloat(info.total_balance).toFixed(2)}`);
      }
    } catch {
      // Silent fail
      setBalance(null);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConv?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const isConfigured = settings.apiKey && settings.model && settings.baseUrl;
  const currentModelName =
    models.find((m) => m.id === settings.modelId)?.name || settings.model || t('chat.notSelected');

  const totalChars = currentMessages.reduce((acc, m) => acc + m.content.length, 0);

  return (
    <PageContainer>
      <Sidebar>
        <SidebarHeader>
          <NewChatButton onClick={newConversation}>
            <span>✨</span> {t('chat.newChat')}
          </NewChatButton>
        </SidebarHeader>

        <SidebarSection>
          <SectionTitle>{t('chat.recentChats')}</SectionTitle>
          {conversations.map((conv) => (
            <ChatHistoryItem
              key={conv.id}
              active={conv.id === activeConversationId}
              onClick={() => switchConversation(conv.id)}
            >
              <ChatItemIcon>💬</ChatItemIcon>
              <ChatItemTitle>{conv.title}</ChatItemTitle>
              <DeleteChatBtn
                className="delete-btn"
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                title={t('chat.deleteChat')}
              >
                ✕
              </DeleteChatBtn>
            </ChatHistoryItem>
          ))}
        </SidebarSection>

        <SidebarFooter>
          {balance && (
            <BalanceRow>
              <BalanceText>💰 {balance}</BalanceText>
              <RefreshBalanceBtn onClick={fetchBalance} title="刷新余额">
                🔄
              </RefreshBalanceBtn>
            </BalanceRow>
          )}
          <SettingsButton onClick={() => setSettingsOpen(true)}>
            ⚙️ {t('chat.settings')}
          </SettingsButton>
        </SidebarFooter>
      </Sidebar>

      <MainArea>
        <ChatSettingsPanel
          open={settingsOpen}
          settings={settings}
          models={models}
          onClose={() => setSettingsOpen(false)}
          onSave={updateSettings}
        />

        {!isConfigured && currentMessages.length === 0 ? (
          <WelcomePage>
            <WelcomeTitle>{t('chat.whatHelp')}</WelcomeTitle>
            <WelcomeSubtitle>{t('chat.welcomeDesc')}</WelcomeSubtitle>
            <WelcomeButton onClick={() => setSettingsOpen(true)}>
              ⚙️ {t('chat.goSettings')}
            </WelcomeButton>
          </WelcomePage>
        ) : currentMessages.length === 0 ? (
          <WelcomePage>
            <WelcomeTitle>{t('chat.whatHelp')}</WelcomeTitle>
            <WelcomeSubtitle>{t('chat.sendHint')}</WelcomeSubtitle>
            <ChatInput
              onSend={sendMessage}
              onStop={stopGeneration}
              isGenerating={isGenerating}
              disabled={!isConfigured}
              currentModelName={currentModelName}
              onModelClick={() => setSettingsOpen(true)}
              tokenCount={totalChars}
            />
          </WelcomePage>
        ) : (
          <>
            <MessagesContainer>
              {currentMessages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isGenerating={isGenerating && idx === currentMessages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </MessagesContainer>
            <ChatInput
              onSend={sendMessage}
              onStop={stopGeneration}
              isGenerating={isGenerating}
              disabled={!isConfigured}
              currentModelName={currentModelName}
              onModelClick={() => setSettingsOpen(true)}
              tokenCount={totalChars}
            />
          </>
        )}
      </MainArea>
    </PageContainer>
  );
};

export default ChatPage;
