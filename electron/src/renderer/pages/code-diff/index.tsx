import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Empty, Segmented, Tag, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  DiffOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MinusOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { CodeDiffFile, DiffRow, DiffSide, InlineSegment } from './types';
import { createDiffResult } from './utils/diff';
import './index.css';
import demoLeftContent from './utils/code-diff-fixture-left.ts?raw';
import demoRightContent from './utils/code-diff-fixture-right.ts?raw';

type DiffViewMode = 'split' | 'unified';

const ACCEPTED_CODE_EXTENSIONS = [
  '.txt',
  '.text',
  '.log',
  '.json',
  '.md',
  '.markdown',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.htm',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.env',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.cc',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.swift',
  '.kt',
  '.kts',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
].join(',');

const DEMO_LEFT = demoLeftContent;
const DEMO_RIGHT = demoRightContent;
const DEMO_LEFT_NAME = 'code-diff-fixture-left.ts';
const DEMO_RIGHT_NAME = 'code-diff-fixture-right.ts';

interface FileCardProps {
  dragging: boolean;
  file: CodeDiffFile | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragChange: (side: DiffSide, dragging: boolean) => void;
  onDrop: (side: DiffSide, file?: File) => void;
  onPick: (side: DiffSide, file?: File) => void;
  onSelectClick: (side: DiffSide) => void;
  side: DiffSide;
  title: string;
  t: (key: string) => string;
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  tone: 'neutral' | 'changed' | 'added' | 'removed';
  value: number;
}

interface UnifiedLine {
  key: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
  segments?: InlineSegment[];
  sign: string;
  text: string;
  tone: 'context' | 'removed' | 'added';
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function countLines(content: string): number {
  if (!content) return 0;
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.length;
}

function createDemoFile(name: string, content: string): CodeDiffFile {
  return {
    content,
    loadedAt: Date.now(),
    name,
    size: new Blob([content]).size,
    source: 'demo',
  };
}

function getRowSign(row: DiffRow, side: DiffSide): string {
  if (row.type === 'changed') return '~';
  if (row.type === 'delete' && side === 'left') return '-';
  if (row.type === 'add' && side === 'right') return '+';
  return '';
}

function getUnifiedLines(row: DiffRow): UnifiedLine[] {
  if (row.type === 'changed') {
    return [
      {
        key: 'removed',
        leftLineNumber: row.leftLineNumber,
        segments: row.leftSegments,
        sign: '-',
        text: row.leftText,
        tone: 'removed',
      },
      {
        key: 'added',
        rightLineNumber: row.rightLineNumber,
        segments: row.rightSegments,
        sign: '+',
        text: row.rightText,
        tone: 'added',
      },
    ];
  }

  if (row.type === 'delete') {
    return [
      {
        key: 'removed',
        leftLineNumber: row.leftLineNumber,
        segments: row.leftSegments,
        sign: '-',
        text: row.leftText,
        tone: 'removed',
      },
    ];
  }

  if (row.type === 'add') {
    return [
      {
        key: 'added',
        rightLineNumber: row.rightLineNumber,
        segments: row.rightSegments,
        sign: '+',
        text: row.rightText,
        tone: 'added',
      },
    ];
  }

  return [
    {
      key: 'context',
      leftLineNumber: row.leftLineNumber,
      rightLineNumber: row.rightLineNumber,
      segments: row.leftSegments,
      sign: '',
      text: row.leftText,
      tone: 'context',
    },
  ];
}

function renderSegments(segments: InlineSegment[] | undefined, fallback: string) {
  const visibleSegments = segments?.length ? segments : [{ text: fallback, type: 'equal' as const }];

  return visibleSegments.map((segment, index) => (
    <span
      className={`code-diff-token is-${segment.type}`}
      key={`${index}-${segment.type}-${segment.text}`}
    >
      {segment.text}
    </span>
  ));
}

function StatPill({ icon, label, tone, value }: StatPillProps) {
  return (
    <div className={`code-diff-stat is-${tone}`}>
      <span className="code-diff-stat-icon">{icon}</span>
      <span className="code-diff-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FileCard({
  dragging,
  file,
  inputRef,
  onDragChange,
  onDrop,
  onPick,
  onSelectClick,
  side,
  title,
  t,
}: FileCardProps) {
  return (
    <div
      className={`code-diff-file-card is-${side}${dragging ? ' is-dragging' : ''}`}
      data-code-diff-drop-zone="true"
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragChange(side, true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => onDragChange(side, false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragChange(side, false);
        onDrop(side, event.dataTransfer.files[0]);
      }}
    >
      <div className="code-diff-file-main">
        <FileTextOutlined />
        <div className="code-diff-file-copy">
          <Typography.Text className="code-diff-file-title" strong>
            {title}
          </Typography.Text>
          <Typography.Text className="code-diff-file-name" title={file?.name}>
            {file?.name ?? t(side === 'left' ? 'codeDiff.dropLeft' : 'codeDiff.dropRight')}
          </Typography.Text>
        </div>
      </div>
      <div className="code-diff-file-meta">
        {file ? (
          <>
            <Tag>{formatBytes(file.size)}</Tag>
            <Tag>{t('codeDiff.lineCount').replace('{count}', String(countLines(file.content)))}</Tag>
            {file.source === 'demo' && <Tag color="blue">{t('codeDiff.demoTag')}</Tag>}
          </>
        ) : (
          <Typography.Text type="secondary">{t('codeDiff.dropHint')}</Typography.Text>
        )}
      </div>
      <Button icon={<FolderOpenOutlined />} onClick={() => onSelectClick(side)}>
        {t(side === 'left' ? 'codeDiff.chooseLeft' : 'codeDiff.chooseRight')}
      </Button>
      <input
        accept={ACCEPTED_CODE_EXTENSIONS}
        className="code-diff-file-input"
        onChange={(event) => {
          const selectedFile = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          onPick(side, selectedFile);
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

interface CodeDiffPageProps {
  active: boolean;
}

const CodeDiffPage: React.FC<CodeDiffPageProps> = ({ active }) => {
  const [leftFile, setLeftFile] = useState<CodeDiffFile | null>(() => createDemoFile(DEMO_LEFT_NAME, DEMO_LEFT));
  const [rightFile, setRightFile] = useState<CodeDiffFile | null>(() => createDemoFile(DEMO_RIGHT_NAME, DEMO_RIGHT));
  const [draggingSide, setDraggingSide] = useState<DiffSide | null>(null);
  const [viewMode, setViewMode] = useState<DiffViewMode>('split');
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const leftInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();
  const { t } = useTranslation();
  const diff = useMemo(() => {
    if (!leftFile || !rightFile) return null;
    return createDiffResult(leftFile.content, rightFile.content);
  }, [leftFile, rightFile]);
  const diffRowIndexes = useMemo(() => (
    diff?.rows.reduce<number[]>((indexes, row, index) => {
      if (row.type !== 'equal') indexes.push(index);
      return indexes;
    }, []) ?? []
  ), [diff]);
  const diffRowCount = diffRowIndexes.length;

  useEffect(() => {
    setActiveDiffIndex(0);
  }, [diffRowCount, leftFile?.loadedAt, rightFile?.loadedAt]);

  const jumpToDiff = (direction: 1 | -1) => {
    if (diffRowCount === 0) return;

    const nextIndex = (activeDiffIndex + direction + diffRowCount) % diffRowCount;
    setActiveDiffIndex(nextIndex);

    window.requestAnimationFrame(() => {
      const rowIndex = diffRowIndexes[nextIndex];
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-diff-row-index="${rowIndex}"]`);
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  const selectInput = (side: DiffSide) => {
    if (side === 'left') {
      leftInputRef.current?.click();
      return;
    }
    rightInputRef.current?.click();
  };

  const updateDraggingSide = (side: DiffSide, dragging: boolean) => {
    setDraggingSide((current) => {
      if (dragging) return side;
      return current === side ? null : current;
    });
  };

  const loadFile = async (side: DiffSide, file?: File) => {
    if (!file) return;

    try {
      const content = await file.text();
      const nextFile: CodeDiffFile = {
        content,
        loadedAt: file.lastModified || Date.now(),
        name: file.name,
        size: file.size,
        source: 'file',
      };

      if (side === 'left') {
        setLeftFile(nextFile);
      } else {
        setRightFile(nextFile);
      }

      message.success(t('codeDiff.fileLoaded').replace('{name}', file.name));
    } catch {
      message.error(t('codeDiff.fileFailed'));
    }
  };

  const loadDemo = () => {
    setLeftFile(createDemoFile(DEMO_LEFT_NAME, DEMO_LEFT));
    setRightFile(createDemoFile(DEMO_RIGHT_NAME, DEMO_RIGHT));
    message.success(t('codeDiff.demoLoaded'));
  };

  const swapFiles = () => {
    setLeftFile(rightFile);
    setRightFile(leftFile);
  };

  const clearFiles = () => {
    setLeftFile(null);
    setRightFile(null);
  };

  const handleViewModeChange = (nextMode: DiffViewMode) => {
    setViewMode(nextMode);
  };

  return (
    <section className={`code-diff-page${active ? ' is-active' : ''}`}>
      <header className="code-diff-header">
        <div className="code-diff-title-wrap">
          <span className="code-diff-title-line">
            <DiffOutlined />
            <Typography.Title className="code-diff-title" level={3}>
              {t('nav.codeDiff')}
            </Typography.Title>
          </span>
          <Typography.Paragraph className="code-diff-subtitle" type="secondary">
            {t('codeDiff.subtitle')}
          </Typography.Paragraph>
        </div>
        <div className="code-diff-actions">
          <Button icon={<FolderOpenOutlined />} onClick={() => selectInput('left')}>
            {t('codeDiff.chooseLeft')}
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={() => selectInput('right')}>
            {t('codeDiff.chooseRight')}
          </Button>
          <Segmented<DiffViewMode>
            className="code-diff-view-mode"
            options={[
              { label: t('codeDiff.splitView'), value: 'split' },
              { label: t('codeDiff.unifiedView'), value: 'unified' },
            ]}
            value={viewMode}
            onChange={handleViewModeChange}
          />
          <Button disabled={!leftFile && !rightFile} icon={<SwapOutlined />} onClick={swapFiles}>
            {t('codeDiff.swap')}
          </Button>
          <Button icon={<DiffOutlined />} onClick={loadDemo}>
            {t('codeDiff.loadDemo')}
          </Button>
          <Button disabled={!leftFile && !rightFile} icon={<ClearOutlined />} onClick={clearFiles}>
            {t('codeDiff.clear')}
          </Button>
        </div>
      </header>

      <div className="code-diff-body">
        <div className="code-diff-file-grid">
          <FileCard
            dragging={draggingSide === 'left'}
            file={leftFile}
            inputRef={leftInputRef}
            onDragChange={updateDraggingSide}
            onDrop={(side, file) => void loadFile(side, file)}
            onPick={(side, file) => void loadFile(side, file)}
            onSelectClick={selectInput}
            side="left"
            t={t}
            title={t('codeDiff.leftTitle')}
          />
          <FileCard
            dragging={draggingSide === 'right'}
            file={rightFile}
            inputRef={rightInputRef}
            onDragChange={updateDraggingSide}
            onDrop={(side, file) => void loadFile(side, file)}
            onPick={(side, file) => void loadFile(side, file)}
            onSelectClick={selectInput}
            side="right"
            t={t}
            title={t('codeDiff.rightTitle')}
          />
        </div>

        <div className="code-diff-summary">
          <div className="code-diff-summary-main">
            <StatPill
              icon={<CheckCircleOutlined />}
              label={t('codeDiff.unchanged')}
              tone="neutral"
              value={diff?.stats.unchanged ?? 0}
            />
            <StatPill
              icon={<EditOutlined />}
              label={t('codeDiff.changed')}
              tone="changed"
              value={diff?.stats.changed ?? 0}
            />
            <StatPill
              icon={<PlusOutlined />}
              label={t('codeDiff.added')}
              tone="added"
              value={diff?.stats.added ?? 0}
            />
            <StatPill
              icon={<MinusOutlined />}
              label={t('codeDiff.removed')}
              tone="removed"
              value={diff?.stats.removed ?? 0}
            />
          </div>
          <div className="code-diff-summary-side">
            <div className="code-diff-jump-controls">
              <Button
                aria-label={t('codeDiff.previousDiff')}
                disabled={diffRowCount === 0}
                icon={<ArrowUpOutlined />}
                onClick={() => jumpToDiff(-1)}
                size="small"
                title={t('codeDiff.previousDiff')}
              >
                {t('codeDiff.previousDiffShort')}
              </Button>
              <span className="code-diff-jump-count">
                {t('codeDiff.diffPosition')
                  .replace('{current}', diffRowCount ? String(activeDiffIndex + 1) : '0')
                  .replace('{total}', String(diffRowCount))}
              </span>
              <Button
                aria-label={t('codeDiff.nextDiff')}
                disabled={diffRowCount === 0}
                icon={<ArrowDownOutlined />}
                onClick={() => jumpToDiff(1)}
                size="small"
                title={t('codeDiff.nextDiff')}
              >
                {t('codeDiff.nextDiffShort')}
              </Button>
            </div>
            <Tag>{t(diff?.mode === 'fast' ? 'codeDiff.fastMode' : 'codeDiff.exactMode')}</Tag>
            <Tag>
              {t('codeDiff.totalLines')
                .replace('{left}', String(diff?.leftLineCount ?? 0))
                .replace('{right}', String(diff?.rightLineCount ?? 0))}
            </Tag>
          </div>
        </div>

        <div className="code-diff-viewer">
          <div className={`code-diff-scroll is-${viewMode}`} ref={scrollRef}>
            <div className={`code-diff-table-head is-${viewMode}`}>
              {viewMode === 'split' ? (
                <>
                  <div className="code-diff-side-head">
                    <strong>{leftFile?.name ?? t('codeDiff.leftTitle')}</strong>
                  </div>
                  <div className="code-diff-side-head">
                    <strong>{rightFile?.name ?? t('codeDiff.rightTitle')}</strong>
                  </div>
                </>
              ) : (
                <div className="code-diff-side-head">
                  <strong>{t('codeDiff.unifiedTitle')}</strong>
                  <span className="code-diff-unified-files">
                    {leftFile?.name ?? t('codeDiff.leftTitle')} {'->'} {rightFile?.name ?? t('codeDiff.rightTitle')}
                  </span>
                </div>
              )}
            </div>

            {diff && diff.rows.length > 0 ? (
              diff.rows.map((row, rowIndex) => {
                const diffIndex = diffRowIndexes.indexOf(rowIndex);
                const isActiveDiffRow = diffIndex !== -1 && diffIndex === activeDiffIndex;

                if (viewMode === 'unified') {
                  return (
                    <div
                      className={`code-diff-unified-row is-${row.type}${isActiveDiffRow ? ' is-current' : ''}`}
                      data-diff-row-index={rowIndex}
                      key={row.key}
                    >
                      {getUnifiedLines(row).map((line) => (
                        <div className={`code-diff-unified-line is-${line.tone}`} key={line.key}>
                          <span className="code-diff-sign">{line.sign}</span>
                          <span className="code-diff-line-number">{line.leftLineNumber ?? ''}</span>
                          <span className="code-diff-line-number">{line.rightLineNumber ?? ''}</span>
                          <code>{renderSegments(line.segments, line.text)}</code>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    className={`code-diff-row is-${row.type}${isActiveDiffRow ? ' is-current' : ''}`}
                    data-diff-row-index={rowIndex}
                    key={row.key}
                  >
                    <div className="code-diff-line code-diff-line-left">
                      <span className="code-diff-sign">{getRowSign(row, 'left')}</span>
                      <span className="code-diff-line-number">{row.leftLineNumber ?? ''}</span>
                      <code>{renderSegments(row.leftSegments, row.leftText)}</code>
                    </div>
                    <div className="code-diff-line code-diff-line-right">
                      <span className="code-diff-sign">{getRowSign(row, 'right')}</span>
                      <span className="code-diff-line-number">{row.rightLineNumber ?? ''}</span>
                      <code>{renderSegments(row.rightSegments, row.rightText)}</code>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="code-diff-empty">
                <Empty
                  description={leftFile || rightFile ? t('codeDiff.noRows') : t('codeDiff.empty')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button icon={<DiffOutlined />} onClick={loadDemo} type="primary">
                    {t('codeDiff.loadDemo')}
                  </Button>
                </Empty>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodeDiffPage;
