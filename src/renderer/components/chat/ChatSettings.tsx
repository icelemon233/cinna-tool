import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import type { ChatSettings } from '../../store/chatStore';
import type { ModelInfo } from '../../types/electron.d';

const Panel = styled.div<{ open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 380px;
  height: 100%;
  background: #17171f;
  border-left: 1px solid #2a2a3d;
  z-index: 100;
  display: flex;
  flex-direction: column;
  transform: translateX(${({ open }) => (open ? '0' : '100%')});
  transition: transform 0.3s ease;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
  pointer-events: ${({ open }) => (open ? 'auto' : 'none')};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #2a2a3d;
`;

const HeaderTitle = styled.h2`
  font-size: 15px;
  font-weight: 700;
  color: #e8e8f0;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #8888a8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #252536;
    color: #e8e8f0;
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
  color: #8888a8;
  letter-spacing: 0.3px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  background: #1e1e2a;
  border: 1px solid #2a2a3d;
  border-radius: 8px;
  color: #e8e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  appearance: none;

  &:focus {
    border-color: #f59e0b;
  }

  option {
    background: #1e1e2a;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: #1e1e2a;
  border: 1px solid #2a2a3d;
  border-radius: 8px;
  color: #e8e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #f59e0b;
  }

  &::placeholder {
    color: #55556a;
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
  color: #55556a;

  &:hover {
    color: #8888a8;
  }
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #f59e0b;
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;

  &:hover {
    background: #fbbf24;
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
        <HeaderTitle>⚙️ 模型设置</HeaderTitle>
        <CloseButton onClick={onClose}>✕</CloseButton>
      </Header>
      <Body>
        <FormGroup>
          <Label>选择模型</Label>
          <Select value={modelId} onChange={(e) => handleModelChange(e.target.value)}>
            <option value="">-- 请选择模型 --</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup hidden={!isCustom}>
          <Label>API 地址</Label>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
          />
        </FormGroup>

        <FormGroup hidden={!isCustom}>
          <Label>模型名称</Label>
          <Input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="如: gpt-4o"
          />
        </FormGroup>

        <FormGroup>
          <Label>API Key</Label>
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
          <Label>对话名称（可选）</Label>
          <Input
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="给对话起个名字"
          />
        </FormGroup>

        <SaveButton onClick={handleSave}>🚀 保存并开始聊天</SaveButton>
      </Body>
    </Panel>
  );
};

export default ChatSettingsPanel;
