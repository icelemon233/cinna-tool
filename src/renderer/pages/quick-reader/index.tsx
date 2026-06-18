import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Input, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  FileSearchOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import { ReaderContent } from './components/ReaderContent';
import { useQuickReaderEvents } from './hooks/useQuickReaderEvents';
import { emptyReader } from './types';
import { createReaderFromPastedText } from './utils/fileSupport';
import { getModeIcon, getModeLabel } from './utils/readerMeta';
import { countSearchMatches, normalizeSearchQuery } from './utils/searchHighlight';
import './index.css';

interface QuickReaderProps {
  active: boolean;
  onActivate: () => void;
}

const QuickReader: React.FC<QuickReaderProps> = ({ active, onActivate }) => {
  const [reader, setReader] = useState(emptyReader);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const { message } = App.useApp();
  const { t } = useTranslation();
  const searchMatchCount = useMemo(
    () => countSearchMatches(reader.content, searchQuery),
    [reader.content, searchQuery]
  );
  const hasSearchQuery = Boolean(normalizeSearchQuery(searchQuery));

  useQuickReaderEvents({
    message,
    onActivate,
    setReader,
    t,
  });

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [reader.content, searchQuery]);

  useEffect(() => {
    if (searchMatchCount === 0) {
      setActiveSearchIndex(0);
      return;
    }

    setActiveSearchIndex((current) => Math.min(current, searchMatchCount - 1));
  }, [searchMatchCount]);

  const stepSearch = (direction: 1 | -1) => {
    if (searchMatchCount === 0) return;
    setActiveSearchIndex((current) => (
      current + direction + searchMatchCount
    ) % searchMatchCount);
  };

  const clearReader = () => {
    setReader(emptyReader);
    setSearchQuery('');
    setActiveSearchIndex(0);
  };

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
          <div className="quick-reader-actions">
            <div className="quick-reader-search-bar">
              <Input
                allowClear
                className="quick-reader-search-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                onPressEnter={(event) => {
                  stepSearch(event.shiftKey ? -1 : 1);
                }}
                placeholder={t('quickReader.searchPlaceholder')}
                prefix={<SearchOutlined />}
                size="small"
                value={searchQuery}
              />
              <span className="quick-reader-search-count">
                {hasSearchQuery
                  ? t('quickReader.searchCount')
                    .replace('{current}', searchMatchCount ? String(activeSearchIndex + 1) : '0')
                    .replace('{total}', String(searchMatchCount))
                  : t('quickReader.searchIdle')}
              </span>
              <Button
                aria-label={t('quickReader.searchPrevious')}
                disabled={searchMatchCount === 0}
                icon={<ArrowUpOutlined />}
                onClick={() => stepSearch(-1)}
                size="small"
                title={t('quickReader.searchPrevious')}
              />
              <Button
                aria-label={t('quickReader.searchNext')}
                disabled={searchMatchCount === 0}
                icon={<ArrowDownOutlined />}
                onClick={() => stepSearch(1)}
                size="small"
                title={t('quickReader.searchNext')}
              />
            </div>
            <Button onClick={clearReader}>{t('quickReader.clear')}</Button>
          </div>
        )}
      </header>

      <div className="quick-reader-body">
        <div className="quick-reader-surface">
          {reader.content ? (
            <ReaderContent
              reader={reader}
              searchState={{
                activeIndex: activeSearchIndex,
                query: searchQuery,
              }}
            />
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
