import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import { SearchControls } from './components/SearchControls';
import { SearchDropZone } from './components/SearchDropZone';
import { SearchResultsPanel } from './components/SearchResultsPanel';
import { SearchStatusBar } from './components/SearchStatusBar';
import { useTextSearchWorker } from './hooks/useTextSearchWorker';
import { useVirtualRows } from './hooks/useVirtualRows';
import type { QuickSearchDropRequest } from './types';
import './index.css';

interface QuickSearchProps {
  active: boolean;
  droppedFile?: QuickSearchDropRequest | null;
}

const QuickSearch: React.FC<QuickSearchProps> = ({ active, droppedFile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(420);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const handledDroppedFileIdRef = useRef<number | null>(null);
  const { message } = App.useApp();
  const { t } = useTranslation();
  const search = useTextSearchWorker(file, query, caseSensitive);
  const virtualRows = useVirtualRows(search.results, scrollTop, viewportHeight);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [active, search.debouncedQuery, file]);

  const selectFile = useCallback((selected: File | undefined) => {
    if (!selected) return;
    search.resetSearch();
    setFile(selected);
    setQuery('');
    setScrollTop(0);
    message.success(t('quickSearch.fileLoaded'));
  }, [message, search, t]);

  useEffect(() => {
    if (!droppedFile || handledDroppedFileIdRef.current === droppedFile.id) return;

    handledDroppedFileIdRef.current = droppedFile.id;
    setDragging(false);
    selectFile(droppedFile.file);
  }, [droppedFile, selectFile]);

  const clearSearch = () => {
    search.resetSearch();
    setFile(null);
    setQuery('');
    setScrollTop(0);
  };

  const progressPercent =
    file && file.size > 0 ? Math.min(100, Math.round((search.bytesRead / file.size) * 100)) : 0;

  return (
    <section className={`quick-search-page${active ? ' is-active' : ''}`}>
      <header className="quick-search-header">
        <div className="quick-search-title-wrap">
          <span className="quick-search-title-line">
            <SearchOutlined />
            <Typography.Title className="quick-search-title" level={3}>
              {t('nav.search')}
            </Typography.Title>
          </span>
          <Typography.Paragraph className="quick-search-subtitle" type="secondary">
            {t('quickSearch.subtitle')}
          </Typography.Paragraph>
        </div>
        <SearchControls
          caseSensitive={caseSensitive}
          file={file}
          inputRef={inputRef}
          onCaseSensitiveChange={setCaseSensitive}
          onFileSelected={selectFile}
          onQueryChange={setQuery}
          query={query}
          t={t}
        />
      </header>

      <div className="quick-search-body">
        <div className="quick-search-shell">
          <SearchDropZone
            dragging={dragging}
            file={file}
            onClear={clearSearch}
            onDrop={selectFile}
            setDragging={setDragging}
            t={t}
          />

          <div className="quick-search-results">
            <SearchStatusBar
              durationMs={search.durationMs}
              lineCount={search.lineCount}
              matchCount={search.matchCount}
              progressPercent={progressPercent}
              status={search.status}
              t={t}
            />
            <SearchResultsPanel
              caseSensitive={caseSensitive}
              debouncedQuery={search.debouncedQuery}
              error={search.error}
              file={file}
              results={search.results}
              scrollerRef={scrollerRef}
              setScrollTop={setScrollTop}
              status={search.status}
              t={t}
              {...virtualRows}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickSearch;
