import React, { useEffect, useState } from 'react';
import { Button, Divider, Drawer, Form, Input, InputNumber, Select, Slider, Typography } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { ChatSettings } from '@/shared/store/chatStore';
import type { ModelInfo } from '@/shared/types/electron.d';
import './ChatSettings.css';

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
    onClose();
  };

  return (
    <Drawer
      title={
        <>
          <SettingOutlined /> {t('chat.modelSettings')}
        </>
      }
      open={open}
      size={380}
      placement="right"
      onClose={onClose}
      getContainer={false}
    >
      <Form layout="vertical">
        <Typography.Text type="secondary">{t('chat.settingsDesc')}</Typography.Text>
        <Divider>{t('chat.connectionSettings')}</Divider>

        <Form.Item label={t('chat.selectModel')}>
          <Select
            value={modelId}
            onChange={handleModelChange}
            options={[
              { value: '', label: `-- ${t('chat.selectModel')} --` },
              ...models.map((model) => ({ value: model.id, label: model.name })),
            ]}
          />
        </Form.Item>

        {isCustom && (
          <>
            <Form.Item label={t('chat.apiAddress')}>
              <Input
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </Form.Item>

            <Form.Item label={t('chat.modelName')}>
              <Input
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
                placeholder="gpt-4o"
              />
            </Form.Item>
          </>
        )}

        <Form.Item label={t('settings.apiKey')}>
          <Input.Password
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
          />
        </Form.Item>

        <Form.Item label={t('chat.chatName')}>
          <Input
            value={chatName}
            onChange={(event) => setChatName(event.target.value)}
            placeholder={t('chat.chatName')}
          />
        </Form.Item>

        <Divider>{t('chat.promptSettings')}</Divider>

        <Form.Item label={t('chat.systemPrompt')}>
          <Input.TextArea
            value={systemPrompt}
            autoSize={{ minRows: 4, maxRows: 7 }}
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder={t('chat.systemPromptPlaceholder')}
          />
        </Form.Item>

        <Divider>{t('chat.generationSettings')}</Divider>

        <Form.Item label={`${t('chat.temperature')} ${temperature.toFixed(2)}`}>
          <Slider
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={setTemperature}
          />
        </Form.Item>

        <Form.Item label={`${t('chat.topP')} ${topP.toFixed(2)}`}>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={topP}
            onChange={setTopP}
          />
        </Form.Item>

        <Form.Item label={t('chat.maxTokens')}>
          <InputNumber
            className="chat-settings-number-input"
            min={256}
            max={8192}
            step={256}
            value={maxTokens}
            onChange={(value) => setMaxTokens(value ?? 4096)}
          />
        </Form.Item>

        <Button type="primary" block icon={<SaveOutlined />} onClick={handleSave}>
          {t('chat.saveAndStart')}
        </Button>
      </Form>
    </Drawer>
  );
};

export default ChatSettingsPanel;
