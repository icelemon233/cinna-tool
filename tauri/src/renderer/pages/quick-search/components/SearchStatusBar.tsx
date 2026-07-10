import { Progress, Space, Tag } from 'antd';
import type { SearchStatus } from '../types';

interface SearchStatusBarProps {
  durationMs: number;
  lineCount: number;
  matchCount: number;
  progressPercent: number;
  status: SearchStatus;
  t: (key: string) => string;
}

export function SearchStatusBar({
  durationMs,
  lineCount,
  matchCount,
  progressPercent,
  status,
  t,
}: SearchStatusBarProps) {
  const statusText =
    status === 'searching'
      ? t('quickSearch.searching')
      : status === 'done'
        ? t('quickSearch.done').replace('{ms}', String(durationMs))
        : status === 'error'
          ? t('quickSearch.error')
          : t('quickSearch.ready');

  return (
    <div className="quick-search-status">
      <Space size={[8, 8]} wrap>
        <Tag color={status === 'searching' ? 'processing' : status === 'error' ? 'error' : 'default'}>
          {statusText}
        </Tag>
        <Tag>{t('quickSearch.lines').replace('{count}', String(lineCount))}</Tag>
        <Tag color="success">{t('quickSearch.matches').replace('{count}', String(matchCount))}</Tag>
      </Space>
      <div className="quick-search-progress-wrap">
        <Progress percent={progressPercent} size="small" showInfo={false} />
      </div>
    </div>
  );
}
