import React, { useEffect, useMemo, useRef } from 'react';
import { useChatStore } from '@/shared/store/chatStore';
import { useTranslation } from '@/shared/i18n';
import ChatSkillsPanel from './components/ChatSkillsPanel';
import { ChatConversationView } from './components/ChatConversationView';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatToolPanel } from './components/ChatToolPanel';
import { ChatWelcome } from './components/ChatWelcome';
import {
  displayConversationTitle,
  estimateTokenCount,
  getGreetingKey,
} from './utils';
import { useChatBalance } from './hooks/useChatBalance';
import './index.css';

const ChatPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    isGenerating,
    settings,
    models,
    skills,
    skillsOpen,
    newConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    loadSettings,
    loadModels,
    setSkillsOpen,
    addSkill,
    updateSkill,
    deleteSkill,
    toggleSkill,
  } = useChatStore();

  const { t } = useTranslation();
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    loadSettings();
  }, [loadModels, loadSettings]);

  const { balance, fetchBalance } = useChatBalance(settings.apiKey, settings.baseUrl);
  const activeConv = conversations.find((conversation) => conversation.id === activeConversationId);
  const currentMessages = activeConv?.messages || [];

  useEffect(() => {
    const messagesElement = messagesRef.current;
    if (!messagesElement) return;
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }, [currentMessages]);

  const isConfigured = Boolean(settings.apiKey && settings.model && settings.baseUrl);
  const hasBalanceConfig = Boolean(settings.apiKey && settings.baseUrl);
  const currentModelName =
    models.find((model) => model.id === settings.modelId)?.name || settings.model || t('chat.notSelected');
  const enabledSkillNames = useMemo(
    () => skills.filter((skill) => skill.enabled).map((skill) => skill.name),
    [skills]
  );

  const conversationTokenCount = estimateTokenCount(currentMessages);
  const greeting = t(getGreetingKey()).replace('{name}', t('chat.guestName'));
  const openAISettings = () => {
    void window.cinnaAPI?.openAISettings?.();
  };
  const inputProps = {
    onSend: sendMessage,
    onStop: stopGeneration,
    isGenerating,
    disabled: !isConfigured,
    currentModelName,
    onModelClick: openAISettings,
    conversationTokenCount,
    activeSkillNames: enabledSkillNames,
    onSkillsClick: () => setSkillsOpen(true),
  };
  const renderToolPanel = () => (
    <ChatToolPanel
      balance={balance}
      enabledSkillCount={enabledSkillNames.length}
      hasBalanceConfig={hasBalanceConfig}
      onOpenSettings={openAISettings}
      onOpenSkills={() => setSkillsOpen(true)}
      onRefreshBalance={fetchBalance}
      t={t}
    />
  );

  return (
    <section className="chat-page">
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        displayTitle={(title) => displayConversationTitle(title, t)}
        onDeleteConversation={deleteConversation}
        onNewConversation={newConversation}
        onSwitchConversation={switchConversation}
        t={t}
        toolPanel={renderToolPanel()}
      />

      <main className="chat-main">
        <ChatSkillsPanel
          open={skillsOpen}
          skills={skills}
          onClose={() => setSkillsOpen(false)}
          onAdd={addSkill}
          onUpdate={updateSkill}
          onDelete={deleteSkill}
          onToggle={toggleSkill}
        />

        {currentMessages.length === 0 ? (
          <ChatWelcome
            greeting={greeting}
            inputProps={inputProps}
            isConfigured={isConfigured}
            onOpenSettings={openAISettings}
            t={t}
          />
        ) : (
          <ChatConversationView
            inputProps={inputProps}
            isGenerating={isGenerating}
            messages={currentMessages}
            messagesRef={messagesRef}
          />
        )}
        <div className="chat-mobile-tool-dock">{renderToolPanel()}</div>
      </main>
    </section>
  );
};

export default ChatPage;
