import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Input, Select, Typography } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  ImportOutlined,
  SendOutlined,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import { streamChat, stopGeneration } from '@/shared/services/aiService';
import { getEffectiveChatConfig } from '@/shared/store/chat/settings';
import { useChatStore } from '@/shared/store/chatStore';
import {
  useTranslationStore,
  type TranslationTargetLanguage,
} from '@/shared/store/translationStore';
import './index.css';

const TARGET_LANGUAGES: Array<{
  value: TranslationTargetLanguage;
  promptName: string;
  labelKey: string;
}> = [
  { value: 'en', promptName: 'English', labelKey: 'translation.language.english' },
  { value: 'zh-CN', promptName: 'Simplified Chinese', labelKey: 'translation.language.chinese' },
  { value: 'ja', promptName: 'Japanese', labelKey: 'translation.language.japanese' },
  { value: 'ko', promptName: 'Korean', labelKey: 'translation.language.korean' },
  { value: 'fr', promptName: 'French', labelKey: 'translation.language.french' },
  { value: 'de', promptName: 'German', labelKey: 'translation.language.german' },
  { value: 'es', promptName: 'Spanish', labelKey: 'translation.language.spanish' },
  { value: 'pt', promptName: 'Portuguese', labelKey: 'translation.language.portuguese' },
  { value: 'it', promptName: 'Italian', labelKey: 'translation.language.italian' },
  { value: 'ru', promptName: 'Russian', labelKey: 'translation.language.russian' },
  { value: 'ar', promptName: 'Arabic', labelKey: 'translation.language.arabic' },
];

interface TranslationPageProps {
  mode?: 'main' | 'floating' | 'popup';
}

const TranslationPage: React.FC<TranslationPageProps> = ({ mode = 'main' }) => {
  const { message } = AntdApp.useApp();
  const { t } = useTranslation();
  const inputRef = useRef<React.ComponentRef<typeof Input.TextArea>>(null);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const targetLanguage = useTranslationStore((state) => state.targetLanguage);
  const setTargetLanguage = useTranslationStore((state) => state.setTargetLanguage);
  const settings = useChatStore((state) => state.settings);
  const models = useChatStore((state) => state.models);
  const loadModels = useChatStore((state) => state.loadModels);
  const loadSettings = useChatStore((state) => state.loadSettings);
  const isCompact = mode !== 'main';
  const isConfigured = Boolean(settings.apiKey && settings.model && settings.baseUrl);

  const languageOptions = useMemo(
    () => TARGET_LANGUAGES.map((language) => ({
      label: t(language.labelKey),
      value: language.value,
    })),
    [t]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      await loadModels();
      await loadSettings();
      if (active) setConfigLoaded(true);
    })();

    return () => {
      active = false;
      stopGeneration();
    };
  }, [loadModels, loadSettings]);

  useEffect(() => {
    if (!isCompact) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(timer);
  }, [isCompact]);

  const handleTranslate = async () => {
    const text = sourceText.trim();
    if (!text || isGenerating) return;

    if (!isConfigured) {
      setError('');
      return;
    }

    const language = TARGET_LANGUAGES.find((item) => item.value === targetLanguage);
    if (!language) return;

    setError('');
    setTranslatedText('');
    setIsGenerating(true);

    const config = {
      ...getEffectiveChatConfig(settings, models, []),
      systemPrompt: [
        'You are a professional translation engine.',
        'Automatically detect the language of the user input.',
        `Translate it into ${language.promptName}.`,
        'Preserve meaning, tone, paragraph breaks, lists, code, placeholders, and proper nouns.',
        'Return only the translated text. Do not explain, label, quote, or wrap the translation.',
      ].join(' '),
      temperature: 0.2,
    };

    try {
      await streamChat(
        [{ role: 'user', content: text }],
        config,
        (chunk) => setTranslatedText((current) => current + chunk),
        (fullText) => setTranslatedText(fullText.trim()),
        (streamError) => setError(streamError.message || t('translation.failed'))
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await window.cinnaAPI.writeClipboardText(translatedText);
      message.success(t('translation.copied'));
    } catch {
      message.warning(t('translation.copyFailed'));
    }
  };

  const handleClear = () => {
    stopGeneration();
    setIsGenerating(false);
    setSourceText('');
    setTranslatedText('');
    setError('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleRestoreMain = async () => {
    try {
      await window.cinnaAPI.restoreClipboardToMainWindow();
    } catch {
      message.warning(t('clipboard.restoreFailed'));
    }
  };

  const handleOpenAISettings = () => {
    void window.cinnaAPI?.openAISettings?.();
  };

  return (
    <section className={`translation-page is-${mode}`}>
      <header className="translation-header">
        <div className="translation-title-wrap">
          <div className="translation-title-line">
            <TranslationOutlined />
            <Typography.Title className="translation-title" level={3}>
              {t('translation.title')}
            </Typography.Title>
          </div>
          <Typography.Paragraph className="translation-subtitle">
            {t('translation.subtitle')}
          </Typography.Paragraph>
        </div>
        <div className="translation-header-actions">
          {mode === 'floating' && (
            <Button icon={<ImportOutlined />} size="small" onClick={handleRestoreMain}>
              {t('clipboard.restoreMain')}
            </Button>
          )}
          <Button
            icon={<SettingOutlined />}
            size={isCompact ? 'small' : 'middle'}
            onClick={handleOpenAISettings}
          >
            {t('settings.ai')}
          </Button>
          <Button icon={<DeleteOutlined />} size={isCompact ? 'small' : 'middle'} onClick={handleClear}>
            {t('translation.clear')}
          </Button>
        </div>
      </header>

      <div className="translation-body">
        {configLoaded && !isConfigured && (
          <Alert
            className="translation-config-alert"
            title={t('translation.notConfigured')}
            showIcon
            type="warning"
          />
        )}
        {error && (
          <Alert
            className="translation-error-alert"
            closable
            title={error}
            onClose={() => setError('')}
            showIcon
            type="error"
          />
        )}

        <div className="translation-language-row">
          <span className="translation-source-language">
            {t('translation.autoDetect')}
          </span>
          <span className="translation-direction">→</span>
          <Select
            aria-label={t('translation.targetLanguage')}
            className="translation-language-select"
            options={languageOptions}
            value={targetLanguage}
            onChange={(value: TranslationTargetLanguage) => setTargetLanguage(value)}
          />
        </div>

        <div className="translation-panels">
          <section className="translation-panel">
            <div className="translation-panel-heading">
              <Typography.Text strong>{t('translation.source')}</Typography.Text>
              <Typography.Text type="secondary">
                {t('translation.characterCount').replace('{count}', String(sourceText.length))}
              </Typography.Text>
            </div>
            <Input.TextArea
              ref={inputRef}
              className="translation-textarea"
              placeholder={t('translation.inputPlaceholder')}
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void handleTranslate();
                }
              }}
            />
          </section>

          <section className="translation-panel translation-result-panel">
            <div className="translation-panel-heading">
              <Typography.Text strong>{t('translation.result')}</Typography.Text>
              <Button
                disabled={!translatedText}
                icon={<CopyOutlined />}
                size="small"
                type="text"
                onClick={handleCopy}
              >
                {t('translation.copy')}
              </Button>
            </div>
            <Input.TextArea
              className="translation-textarea translation-result"
              placeholder={isGenerating ? t('translation.translating') : t('translation.resultPlaceholder')}
              readOnly
              value={translatedText}
            />
          </section>
        </div>

        <div className="translation-footer">
          <Typography.Text className="translation-shortcut-hint" type="secondary">
            {t('translation.shortcutHint')}
          </Typography.Text>
          <Button
            disabled={!sourceText.trim() || !isConfigured}
            icon={<SendOutlined />}
            loading={isGenerating}
            type="primary"
            onClick={() => void handleTranslate()}
          >
            {t('translation.translate')}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TranslationPage;
