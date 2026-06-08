import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useChatStore } from '../../store/chatStore';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSettingsPanel from './ChatSettings';

const PageContainer = styled.div`
  display: flex;
  height: 100%;
  background: #0f0f14;
  color: #e8e8f0;
  position: relative;
`;

const Sidebar = styled.aside`
  width: 220px;
  background: #17171f;
  border-right: 1px solid #2a2a3d;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  padding: 20px 16px 16px;
  border-bottom: 1px solid #2a2a3d;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.span`
  font-size: 24px;
`;

const LogoText = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #e8e8f0;
  letter-spacing: 0.5px;
`;

const SidebarActions = styled.div`
  padding: 12px;
`;

const NewChatButton = styled.button`
  width: 100%;
  padding: 10px 16px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: #f59e0b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: rgba(245, 158, 11, 0.2);
    border-color: #f59e0b;
  }
`;

const ModelSection = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #2a2a3d;
  margin-top: auto;
`;

const ModelLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #55556a;
  margin-bottom: 4px;
`;

const ModelName = styled.div`
  font-size: 13px;
  color: #8888a8;
  font-weight: 500;
`;

const SidebarFooter = styled.div`
  padding: 12px;
  border-top: 1px solid #2a2a3d;
`;

const SettingsButton = styled.button`
  width: 100%;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #2a2a3d;
  border-radius: 8px;
  color: #8888a8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #252536;
    color: #e8e8f0;
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
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #2a2a3d;
    border-radius: 3px;
  }
`;

const WelcomePage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  text-align: center;
`;

const WelcomeIcon = styled.div`
  font-size: 56px;
  margin-bottom: 8px;
`;

const WelcomeTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #e8e8f0;
  margin: 0;
`;

const WelcomeText = styled.p`
  font-size: 14px;
  color: #8888a8;
  margin: 0;
`;

const WelcomeButton = styled.button`
  padding: 10px 28px;
  background: #f59e0b;
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover {
    background: #fbbf24;
  }
`;

const ChatPage: React.FC = () => {
  const {
    messages,
    isGenerating,
    settings,
    models,
    settingsOpen,
    sendMessage,
    stopGeneration,
    clearHistory,
    updateSettings,
    loadSettings,
    loadModels,
    setSettingsOpen,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    loadSettings();
  }, [loadModels, loadSettings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isConfigured = settings.apiKey && settings.model && settings.baseUrl;
  const currentModelName =
    models.find((m) => m.id === settings.modelId)?.name || settings.model || '未选择';

  return (
    <PageContainer>
      <Sidebar>
        <SidebarHeader>
          <Logo>
            <LogoIcon>🧡</LogoIcon>
            <LogoText>AI Chat</LogoText>
          </Logo>
        </SidebarHeader>

        <SidebarActions>
          <NewChatButton onClick={clearHistory}>
            <span>✨</span> 新建对话
          </NewChatButton>
        </SidebarActions>

        <ModelSection>
          <ModelLabel>当前模型</ModelLabel>
          <ModelName>{currentModelName}</ModelName>
        </ModelSection>

        <SidebarFooter>
          <SettingsButton onClick={() => setSettingsOpen(true)}>⚙️ 设置</SettingsButton>
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

        {!isConfigured && messages.length === 0 ? (
          <WelcomePage>
            <WelcomeIcon>🧡</WelcomeIcon>
            <WelcomeTitle>欢迎使用 AI Chat</WelcomeTitle>
            <WelcomeText>选择模型并输入 API Key 开始对话</WelcomeText>
            <WelcomeButton onClick={() => setSettingsOpen(true)}>
              ⚙️ 前往设置
            </WelcomeButton>
          </WelcomePage>
        ) : (
          <>
            <MessagesContainer>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isGenerating={isGenerating && idx === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </MessagesContainer>
            <ChatInput
              onSend={sendMessage}
              onStop={stopGeneration}
              isGenerating={isGenerating}
              disabled={!isConfigured}
            />
          </>
        )}
      </MainArea>
    </PageContainer>
  );
};

export default ChatPage;
