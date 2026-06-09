import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useTranslation } from '../../i18n';
import type { ChatSettings } from '../../store/chatStore';
import type { ModelInfo } from '../../types/electron.d';

const Panel = styled.div<{ open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 380px;
  height: 100%;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transform: translateX(${({ open }) => (open ? '0' : '100%')});
  transition: transform 0.3s ease;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
  pointer-events: ${({ open }) => (open ? 'auto' : 'none')};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-color);
`;

const HeaderTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: var(--accent-light);
    color: var(--text-primary);
  }
`;

const Body = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div<{ hidden?: boolean }>`
  display: ${({ hidden }) => (hidden ? 'none' : 'flex')};
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: none;

  &:focus {
    border-color: var(--accent);
  }

  option {
    background: var(--bg-card);
    color: var(--text-primary);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: var(--accent);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`;

const ApiKeyWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const TogglePwdButton = styled.button`
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  color: var(--text-muted);

  &:hover {
    color: var(--text-secondary);
  }
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 12px;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }
`;

interface ChatSettingsProps {
  open: boolean;
  settings: ChatSettings;
  models: ModelInfo[];
  onClose: () => void;
  onSave: (settings: Partial<ChatSettings>) => void;
}

const ChatSettingsPanel: React.FC<ChatSettingsProps> = ({
  open,
  settings,
  models,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [modelId, setModelId] = useState(settings.modelId);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [modelName, setModelName] = useState(settings.model);
  const [chatName, setChatName] = useState(settings.chatName);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setModelId(settings.modelId);
    setApiKey(settings.apiKey);
    setBaseUrl(settings.baseUrl);
    setModelName(settings.model);
    setChatName(settings.chatName);
  }, [settings]);

  const selectedModel = models.find((m) => m.id === modelId);
  const isCustom = selectedModel?.requiresUrl ?? modelId === 'custom';

  const handleModelChange = (id: string) => {
    setModelId(id);
    const model = models.find((m) => m.id === id);
    if (model && !model.requiresUrl) {
      setBaseUrl(model.baseUrl);
      setModelName(model.model);
    }
  };

  const handleSave = () => {
    const model = models.find((m) => m.id === modelId);
    const finalBaseUrl = isCustom ? baseUrl : (model?.baseUrl || baseUrl);
    const finalModel = isCustom ? modelName : (model?.model || modelName);

    onSave({
      modelId,
      apiKey,
      baseUrl: finalBaseUrl,
      model: finalModel,
      chatName,
    });
    onClose();
  };

  return (
    <Panel open={open}>
      <Header>
        <HeaderTitle>⚙️ {t('chat.modelSettings')}</HeaderTitle>
        <CloseButton onClick={onClose}>✕</CloseButton>
      </Header>
      <Body>
        <FormGroup>
          <Label>{t('chat.selectModel')}</Label>
          <Select value={modelId} onChange={(e) => handleModelChange(e.target.value)}>
            <option value="">-- {t('chat.selectModel')} --</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup hidden={!isCustom}>
          <Label>{t('chat.apiAddress')}</Label>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
          />
        </FormGroup>

        <FormGroup hidden={!isCustom}>
          <Label>{t('chat.modelName')}</Label>
          <Input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="gpt-4o"
          />
        </FormGroup>

        <FormGroup>
          <Label>{t('settings.apiKey')}</Label>
          <ApiKeyWrapper>
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={{ paddingRight: '40px' }}
            />
            <TogglePwdButton onClick={() => setShowKey(!showKey)}>
              {showKey ? '🙈' : '👁'}
            </TogglePwdButton>
          </ApiKeyWrapper>
        </FormGroup>

        <FormGroup>
          <Label>{t('chat.chatName')}</Label>
          <Input
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder={t('chat.chatName')}
          />
        </FormGroup>

        <SaveButton onClick={handleSave}>🚀 {t('chat.saveAndStart')}</SaveButton>
      </Body>
    </Panel>
  );
};

export default ChatSettingsPanel;
