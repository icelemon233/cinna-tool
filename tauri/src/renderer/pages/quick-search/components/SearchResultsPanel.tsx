import type React from 'react';
import { Empty } from 'antd';
import { ROW_HEIGHT } from '../constants';
import { renderHighlightedLine } from '../utils/formatting';
import type { SearchResult, SearchStatus } from '../types';

interface SearchResultsPanelProps {
  caseSensitive: boolean;
  debouncedQuery: string;
  error: string;
  file: File | null;
  results: SearchResult[];
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  setScrollTop: (scrollTop: number) => void;
  status: SearchStatus;
  t: (key: string) => string;
  totalHeight: number;
  visibleRange: { startIndex: number; endIndex: number };
  visibleResults: SearchResult[];
  visibleWidthCh: number;
}

export function SearchResultsPanel({
  caseSensitive,
  debouncedQuery,
  error,
  file,
  results,
  scrollerRef,
  setScrollTop,
  status,
  t,
  totalHeight,
  visibleRange,
  visibleResults,
  visibleWidthCh,
}: SearchResultsPanelProps) {
  if (error) {
    return (
      <div className="quick-search-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error} />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="quick-search-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('quickSearch.emptyFile')} />
      </div>
    );
  }

  if (!debouncedQuery.trim()) {
    return (
      <div className="quick-search-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('quickSearch.emptyQuery')} />
      </div>
    );
  }

  if (results.length === 0 && status !== 'searching') {
    return (
      <div className="quick-search-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('quickSearch.noMatches')} />
      </div>
    );
  }

  return (
    <div
      className="quick-search-scroller"
      ref={scrollerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div
        className="quick-search-sizer"
        style={{
          height: totalHeight,
          width: `max(100%, calc(${visibleWidthCh}ch + 110px))`,
        }}
      >
        <div
          className="quick-search-rows"
          style={{ transform: `translateY(${visibleRange.startIndex * ROW_HEIGHT}px)` }}
        >
          {visibleResults.map((result) => (
            <div
              className="quick-search-result-row"
              key={`${result.lineNumber}-${result.text.slice(0, 20)}`}
            >
              <span className="quick-search-line-number">{result.lineNumber}</span>
              <code className="quick-search-line-text" title={result.text}>
                {renderHighlightedLine(result.text, debouncedQuery, caseSensitive)}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
