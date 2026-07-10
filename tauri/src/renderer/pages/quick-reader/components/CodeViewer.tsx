import { App } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { analyzeJsonLines, type JsonFoldRegion } from '../utils/jsonLineStructure';
import {
  normalizeSearchQuery,
  renderSearchHighlightedNodes,
  scrollActiveSearchMatch,
  type ReaderSearchState,
} from '../utils/searchHighlight';
import { renderHighlightedLine } from '../utils/syntaxHighlight';
import type { ReaderState } from '../types';

interface CodeViewerProps {
  reader: ReaderState;
  searchState: ReaderSearchState;
}

interface VisibleCodeLine {
  index: number;
  text: string;
  foldRegion?: JsonFoldRegion;
  isCollapsed: boolean;
  path: string[];
}

function JsonPathTrail({ path }: { path: string[] }) {
  if (path.length === 0) {
    return <span className="quick-reader-json-path-placeholder">-</span>;
  }

  return (
    <>
      {path.map((segment, index) => (
        <span className="quick-reader-json-path-part" key={`${segment}-${index}`}>
          {index > 0 && !segment.startsWith('[') && (
            <span className="quick-reader-json-path-separator">.</span>
          )}
          <span className={`quick-reader-json-path-segment level-${index % 6}`}>
            {segment}
          </span>
        </span>
      ))}
    </>
  );
}

function formatJsonPath(path: string[]): string {
  return path.reduce((trail, segment, index) => {
    if (index === 0) return segment;
    return segment.startsWith('[') ? `${trail}${segment}` : `${trail}.${segment}`;
  }, '');
}

function CodeViewerComponent({ reader, searchState }: CodeViewerProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const frameRef = useRef<HTMLDivElement>(null);
  const [collapsedLines, setCollapsedLines] = useState<Set<number>>(() => new Set());
  const [hoveredJsonPath, setHoveredJsonPath] = useState<string[]>([]);
  const lines = useMemo(() => reader.content.split(/\r?\n/), [reader.content]);
  const isJson = reader.mode === 'json';
  const hasSearchQuery = Boolean(normalizeSearchQuery(searchState.query));
  const jsonStructure = useMemo(
    () => (isJson ? analyzeJsonLines(lines) : null),
    [isJson, lines]
  );
  const visibleLines = useMemo<VisibleCodeLine[]>(() => {
    const rows: VisibleCodeLine[] = [];
    let skipUntil = -1;

    lines.forEach((line, index) => {
      if (index <= skipUntil) return;

      const foldRegion = jsonStructure?.foldRegions.get(index);
      const isCollapsed = Boolean(foldRegion && collapsedLines.has(index));
      rows.push({
        index,
        text: line,
        foldRegion,
        isCollapsed,
        path: jsonStructure?.lineInfo[index]?.path ?? [],
      });

      if (foldRegion && isCollapsed && !hasSearchQuery) {
        skipUntil = foldRegion.end;
      }
    });

    return rows;
  }, [collapsedLines, hasSearchQuery, jsonStructure, lines]);
  const highlightedLines = useMemo(
    () => {
      const searchCounter = { current: 0 };

      return new Map(
        visibleLines.map((line) => {
          const syntaxNodes = line.text ? renderHighlightedLine(line.text) : ['\u00a0'];

          return [
            line.index,
            renderSearchHighlightedNodes(
              syntaxNodes,
              searchState.query,
              searchState.activeIndex,
              searchCounter
            ),
          ];
        })
      );
    },
    [searchState.activeIndex, searchState.query, visibleLines]
  );
  const language = reader.language || (reader.mode === 'json' ? 'json' : 'code');

  useEffect(() => {
    setCollapsedLines(new Set());
    setHoveredJsonPath([]);
  }, [reader.content]);

  useEffect(() => {
    scrollActiveSearchMatch(frameRef.current, searchState.query, searchState.activeIndex);
  }, [searchState.activeIndex, searchState.query, visibleLines]);

  const toggleFold = useCallback((lineIndex: number) => {
    setCollapsedLines((current) => {
      const next = new Set(current);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  }, []);

  const handleLineClick = useCallback(async (path: string[]) => {
    const pathText = formatJsonPath(path);
    if (!pathText) return;

    setHoveredJsonPath(path);

    try {
      if (window.cinnaAPI?.writeClipboardText) {
        await window.cinnaAPI.writeClipboardText(pathText);
      } else {
        await navigator.clipboard.writeText(pathText);
      }
      message.success(t('quickReader.jsonPathCopied'));
    } catch {
      message.error(t('quickReader.jsonPathCopyFailed'));
    }
  }, [message, t]);

  return (
    <div className="quick-reader-code-frame" ref={frameRef}>
      <div className="quick-reader-code-header">
        <div className="quick-reader-code-title-row">
          <span>{reader.title}</span>
          <span className="quick-reader-code-language">{language}</span>
        </div>
        {isJson && (
          <div className="quick-reader-json-path-row">
            <span className="quick-reader-json-path-label">{t('quickReader.jsonPath')}</span>
            <span className="quick-reader-json-path-value">
              <JsonPathTrail path={hoveredJsonPath} />
            </span>
          </div>
        )}
      </div>
      <div className="quick-reader-code-body">
        {visibleLines.map((line) => (
          <div
            className={[
              'quick-reader-code-line',
              line.foldRegion ? 'has-fold' : '',
              line.isCollapsed ? 'is-collapsed' : '',
              isJson && line.path.length > 0 ? 'is-json-hoverable' : '',
            ].filter(Boolean).join(' ')}
            key={line.index}
            onClick={() => {
              if (isJson) void handleLineClick(line.path);
            }}
            onMouseEnter={() => {
              if (isJson) setHoveredJsonPath(line.path);
            }}
          >
            <span className="quick-reader-line-gutter">
              {line.foldRegion ? (
                <button
                  aria-label={
                    line.isCollapsed
                      ? t('quickReader.expandJson')
                      : t('quickReader.collapseJson')
                  }
                  className="quick-reader-fold-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFold(line.index);
                  }}
                  type="button"
                >
                  {line.isCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                </button>
              ) : (
                <span className="quick-reader-fold-spacer" />
              )}
              <span className="quick-reader-line-number">{line.index + 1}</span>
            </span>
            <code className="quick-reader-line-code">
              {highlightedLines.get(line.index)}
              {line.foldRegion && line.isCollapsed && (
                <span className="quick-reader-fold-summary">
                  {t('quickReader.foldedLines').replace(
                    '{count}',
                    String(line.foldRegion.hiddenLineCount)
                  )}
                </span>
              )}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CodeViewer = memo(CodeViewerComponent);
