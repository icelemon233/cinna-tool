import React, { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Select, Slider, Typography } from 'antd';
import {
  ApiOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FilterOutlined,
  KeyOutlined,
  LinkOutlined,
  MessageOutlined,
  NumberOutlined,
  RobotOutlined,
  SaveOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { ChatSettings } from '@/shared/store/chatStore';
import type { ModelInfo } from '@/shared/types/platform';
import './AISettingsForm.css';

interface AiSettingsFormProps {
  settings: ChatSettings;
  models: ModelInfo[];
  onSave: (settings: Partial<ChatSettings>) => void;
}

interface AiSettingRowProps {
  children: React.ReactNode;
  controlClassName?: string;
  controlId?: string;
  description: string;
  icon: React.ReactNode;
  rowClassName?: string;
  title: string;
  value?: string;
}

function AiSettingRow({
  children,
  controlClassName,
  controlId,
  description,
  icon,
  rowClassName,
  title,
  value,
}: AiSettingRowProps) {
  return (
    <div className={['settings-row', 'ai-settings-row', rowClassName].filter(Boolean).join(' ')}>
      <div className="settings-row-main">
        <div className="settings-row-title">
          {icon}
          {controlId ? <label htmlFor={controlId}>{title}</label> : <span>{title}</span>}
          {value && <span className="ai-settings-value">{value}</span>}
        </div>
        <Typography.Text className="settings-row-desc" type="secondary">
          {description}
        </Typography.Text>
      </div>
      <div
        className={['settings-row-control', 'ai-settings-control', controlClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

const AiSettingsForm: React.FC<AiSettingsFormProps> = ({
  settings,
  models,
  onSave,
}) => {
  const { t } = useTranslation();
  const [modelId, setModelId] = useState(settings.modelId);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [modelName, setModelName] = useState(settings.model);
  const [chatName, setChatName] = useState(settings.chatName);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [topP, setTopP] = useState(settings.topP);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);

  useEffect(() => {
    setModelId(settings.modelId);
    setApiKey(settings.apiKey);
    setBaseUrl(settings.baseUrl);
    setModelName(settings.model);
    setChatName(settings.chatName);
    setSystemPrompt(settings.systemPrompt);
    setTemperature(settings.temperature);
    setTopP(settings.topP);
    setMaxTokens(settings.maxTokens);
  }, [settings]);

  const selectedModel = models.find((model) => model.id === modelId);
  const isCustom = selectedModel?.requiresUrl ?? modelId === 'custom';

  const handleModelChange = (id: string) => {
    setModelId(id);
    const model = models.find((item) => item.id === id);
    if (model && !model.requiresUrl) {
      setBaseUrl(model.baseUrl);
      setModelName(model.model);
    }
  };

  const handleSave = () => {
    const model = models.find((item) => item.id === modelId);
    const finalBaseUrl = isCustom ? baseUrl : model?.baseUrl || baseUrl;
    const finalModel = isCustom ? modelName : model?.model || modelName;

    onSave({
      modelId,
      apiKey,
      baseUrl: finalBaseUrl,
      model: finalModel,
      chatName,
      systemPrompt,
      temperature,
      topP,
      maxTokens,
    });
  };

  return (
    <div className="ai-settings-form">
      <AiSettingRow
        controlId="ai-model-select"
        description={t('chat.selectModelDesc')}
        icon={<RobotOutlined />}
        title={t('chat.selectModel')}
      >
        <Select
          aria-label={t('chat.selectModel')}
          id="ai-model-select"
          value={modelId}
          onChange={handleModelChange}
          options={[
            { value: '', label: `-- ${t('chat.selectModel')} --` },
            ...models.map((model) => ({ value: model.id, label: model.name })),
          ]}
        />
      </AiSettingRow>

      {isCustom && (
        <>
          <AiSettingRow
            controlId="ai-api-address"
            description={t('chat.apiAddressDesc')}
            icon={<LinkOutlined />}
            title={t('chat.apiAddress')}
          >
            <Input
              aria-label={t('chat.apiAddress')}
              id="ai-api-address"
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </AiSettingRow>

          <AiSettingRow
            controlId="ai-model-name"
            description={t('chat.modelNameDesc')}
            icon={<TagOutlined />}
            title={t('chat.modelName')}
          >
            <Input
              aria-label={t('chat.modelName')}
              id="ai-model-name"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              placeholder="gpt-4o"
            />
          </AiSettingRow>
        </>
      )}

      <AiSettingRow
        controlId="ai-api-key"
        description={t('chat.apiKeyDesc')}
        icon={<KeyOutlined />}
        title={t('settings.apiKey')}
      >
        <Input.Password
          aria-label={t('settings.apiKey')}
          id="ai-api-key"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="sk-..."
        />
      </AiSettingRow>

      <AiSettingRow
        controlId="ai-chat-name"
        description={t('chat.chatNameDesc')}
        icon={<MessageOutlined />}
        title={t('chat.chatName')}
      >
        <Input
          aria-label={t('chat.chatName')}
          id="ai-chat-name"
          value={chatName}
          onChange={(event) => setChatName(event.target.value)}
          placeholder={t('chat.chatName')}
        />
      </AiSettingRow>

      <AiSettingRow
        controlId="ai-system-prompt"
        description={t('chat.systemPromptDesc')}
        icon={<FileTextOutlined />}
        rowClassName="ai-settings-row--textarea"
        title={t('chat.systemPrompt')}
      >
        <Input.TextArea
          aria-label={t('chat.systemPrompt')}
          id="ai-system-prompt"
          value={systemPrompt}
          autoSize={{ minRows: 4, maxRows: 7 }}
          onChange={(event) => setSystemPrompt(event.target.value)}
          placeholder={t('chat.systemPromptPlaceholder')}
        />
      </AiSettingRow>

      <AiSettingRow
        controlId="ai-temperature"
        description={t('chat.temperatureDesc')}
        icon={<ExperimentOutlined />}
        title={t('chat.temperature')}
        value={temperature.toFixed(2)}
      >
        <Slider
          aria-label={t('chat.temperature')}
          id="ai-temperature"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={setTemperature}
        />
      </AiSettingRow>

      <AiSettingRow
        controlId="ai-top-p"
        description={t('chat.topPDesc')}
        icon={<FilterOutlined />}
        title={t('chat.topP')}
        value={topP.toFixed(2)}
      >
        <Slider
          aria-label={t('chat.topP')}
          id="ai-top-p"
          min={0}
          max={1}
          step={0.05}
          value={topP}
          onChange={setTopP}
        />
      </AiSettingRow>

      <AiSettingRow
        controlId="ai-max-tokens"
        description={t('chat.maxTokensDesc')}
        icon={<NumberOutlined />}
        title={t('chat.maxTokens')}
      >
        <InputNumber
          aria-label={t('chat.maxTokens')}
          id="ai-max-tokens"
          className="chat-settings-number-input"
          min={256}
          max={8192}
          step={256}
          value={maxTokens}
          onChange={(value) => setMaxTokens(value ?? 4096)}
        />
      </AiSettingRow>

      <AiSettingRow
        controlClassName="settings-row-control--button"
        description={t('chat.settingsDesc')}
        icon={<ApiOutlined />}
        rowClassName="ai-settings-save-row"
        title={t('settings.saveAI')}
      >
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          {t('settings.saveAI')}
        </Button>
      </AiSettingRow>
    </div>
  );
};

export default AiSettingsForm;
