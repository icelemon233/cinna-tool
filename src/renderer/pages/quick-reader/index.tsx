import React, { useState } from 'react';
import { App, Button, Input, Typography } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import { ReaderContent } from './components/ReaderContent';
import { useQuickReaderEvents } from './hooks/useQuickReaderEvents';
import { emptyReader } from './types';
import { createReaderFromPastedText } from './utils/fileSupport';
import { getModeIcon, getModeLabel } from './utils/readerMeta';
import './index.css';

interface QuickReaderProps {
  active: boolean;
  onActivate: () => void;
}

const QuickReader: React.FC<QuickReaderProps> = ({ active, onActivate }) => {
  const [reader, setReader] = useState(emptyReader);
  const { message } = App.useApp();
  const { t } = useTranslation();

  useQuickReaderEvents({
    message,
    onActivate,
    setReader,
    t,
  });

  const handleManualPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData('text/plain');

    try {
      const nextReader = createReaderFromPastedText(text, t);
      if (!nextReader) return;
      event.preventDefault();
      setReader(nextReader);
    } catch {
      event.preventDefault();
      message.warning(t('quickReader.jsonInvalid'));
    }
  };

  return (
    <section className={`quick-reader-page${active ? ' is-active' : ''}`}>
      <header className="quick-reader-header">
        <span className="quick-reader-title-wrap">
          <FileSearchOutlined />
          <Typography.Title className="quick-reader-title" level={3}>
            {t('nav.reader')}
          </Typography.Title>
          {reader.content && (
            <Typography.Text type="secondary">
              {getModeIcon(reader.mode)} {getModeLabel(reader.mode, t)} · {reader.title}
            </Typography.Text>
          )}
        </span>
        {reader.content && (
          <Button onClick={() => setReader(emptyReader)}>{t('quickReader.clear')}</Button>
        )}
      </header>

      <div className="quick-reader-body">
        <div className="quick-reader-surface">
          {reader.content ? (
            <ReaderContent reader={reader} />
          ) : (
            <div className="quick-reader-paste-panel">
              <Input.TextArea
                variant="borderless"
                placeholder={t('quickReader.pastePlaceholder')}
                onPaste={handleManualPaste}
                autoSize={false}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuickReader;
