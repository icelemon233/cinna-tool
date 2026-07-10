import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Empty,
  Progress,
  Segmented,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  GlobalOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useChatStore } from '@/shared/store/chatStore';
import { getEffectiveChatConfig } from '@/shared/store/chat/settings';
import type {
  AiBottleneck,
  AiNetworkIssue,
  ColdStartLaunch,
  ColdStartStage,
  LogAnalysisMode,
  LogAnalysisReport,
  NetworkFailureLayer,
  NetworkFailureReasonStat,
  NetworkEvent,
  ParseProgress,
  StartupNetworkResult,
  StageRankingItem,
} from './types';
import { runAiLogAnalysis } from './utils/aiAnalysis';
import {
  formatBytes,
  formatDuration,
  formatLogTime,
  isLogFile,
  parseLogFile,
} from './utils/parser';
import './index.css';

interface LogAnalysisPageProps {
  active: boolean;
  droppedFile?: {
    id: number;
    file: File;
  } | null;
}

function isAiConfigured(reportMode: LogAnalysisMode): boolean {
  if (reportMode !== 'ai') return false;
  const { settings, models, skills } = useChatStore.getState();
  const config = getEffectiveChatConfig(settings, models, skills);
  return Boolean(config.apiKey && config.baseUrl && config.model);
}

function Section({
  children,
  extra,
  subtitle,
  title,
  variant = 'default',
}: {
  children: React.ReactNode;
  extra?: React.ReactNode;
  subtitle?: string;
  title: string;
  variant?: 'default' | 'diagnostic';
}) {
  return (
    <section className={`log-analysis-report-section is-${variant}`}>
      <header className="log-analysis-section-header">
        <div className="log-analysis-section-title-wrap">
          <Typography.Title level={4}>{title}</Typography.Title>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {extra}
      </header>
      {children}
    </section>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string; detail?: string; status?: string }> }) {
  return (
    <div className="log-analysis-metric-grid">
      {items.map((item) => (
        <div className={`log-analysis-metric-card ${item.status ? `is-${item.status}` : ''}`} key={item.label}>
          <span className="log-analysis-metric-label">{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail && <span className="log-analysis-metric-detail">{item.detail}</span>}
        </div>
      ))}
    </div>
  );
}

function DeviceInfoSection({ report }: { report: LogAnalysisReport }) {
  return (
    <Section title="设备信息">
      <MetricGrid items={report.deviceInfo} />
    </Section>
  );
}

function OperationTag({ type }: { type: ColdStartStage['operationType'] }) {
  return (
    <span className={`log-analysis-operation-tag is-${type}`}>
      {type === 'sync' ? '同步' : '异步'}
    </span>
  );
}

function stopLogDropEvent(event: React.DragEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function LogAnalysisAiSettingsCard({
  configured,
  onOpen,
}: {
  configured: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      aria-label="前往 AI 设置"
      className="log-analysis-ai-settings-card"
      type="button"
      onClick={onOpen}
    >
      <SettingOutlined />
      <span className="log-analysis-ai-settings-main">
        <strong>设置</strong>
        <span>模型、密钥与参数</span>
      </span>
      <span className="log-analysis-ai-settings-side">
        <Tag className={configured ? 'is-ready' : 'is-missing'}>
          {configured ? '已同步' : '未完成'}
        </Tag>
      </span>
    </button>
  );
}

type GanttCategory = 'main' | 'window' | 'network' | 'printer' | 'failure';
type ColdStartViewMode = 'timeline' | 'gantt';

interface MilestoneItem extends ColdStartStage {
  category: GanttCategory;
  count: number;
  candidates: Array<ColdStartStage & { category: GanttCategory; order: number }>;
  mergeKey: string;
  order: number;
  representativeEvidence: string;
  selectedByUser: boolean;
  selectedCandidateId: string;
  selectionKey: string;
}

interface SyncTimelineSlot {
  sync: MilestoneItem;
  asyncItems: MilestoneItem[];
}

interface StageSelectionPrompt {
  candidates: MilestoneItem['candidates'];
  launchTitle: string;
  selectedCandidateId: string;
  selectionKey: string;
  stageName: string;
}

const GANTT_CATEGORY_LABELS: Record<GanttCategory, string> = {
  main: '主进程初始化',
  window: '窗口/页面',
  network: '网络/配置',
  printer: '打印控件',
  failure: '失败/超时',
};

const MILESTONE_MERGE_WINDOW_MS = 500;

function getStageCategory(stage: ColdStartStage): GanttCategory {
  const text = `${stage.name} ${stage.evidence}`;
  if (/失败|错误|超时|ERR_|ENOTFOUND|ECONNRESET|timeout|aborted/i.test(text)) return 'failure';
  if (/Printer|clodop|c-lodop|打印/i.test(text)) return 'printer';
  if (/RemoteConfig|HttpDNS|DNS|network|网络|Proxy|请求|配置/i.test(text)) return 'network';
  if (/DOM|页面|导航|窗口|Window|Loading|Resource interceptor|资源|Web/i.test(text)) return 'window';
  return 'main';
}

function formatGanttDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getScaleMaxMs(launch: ColdStartLaunch, items: MilestoneItem[]): number {
  const maxStageEnd = items.reduce(
    (max, stage) => Math.max(max, stage.endMs - launch.startMs),
    launch.durationMs
  );
  const seconds = Math.max(5, Math.ceil(maxStageEnd / 1000));
  if (seconds <= 10) return 10_000;
  if (seconds <= 20) return 20_000;
  if (seconds <= 40) return Math.ceil(seconds / 5) * 5_000;
  if (seconds <= 90) return Math.ceil(seconds / 10) * 10_000;
  return Math.ceil(seconds / 30) * 30_000;
}

function buildScaleTicks(scaleMaxMs: number): number[] {
  const maxSeconds = scaleMaxMs / 1000;
  const step = maxSeconds <= 20 ? 5 : maxSeconds <= 60 ? 10 : 30;
  const ticks: number[] = [];
  for (let second = 0; second <= maxSeconds; second += step) {
    ticks.push(second);
  }
  if (ticks[ticks.length - 1] !== maxSeconds) ticks.push(maxSeconds);
  return ticks;
}

function getStageSelectionKey(launchId: string, item: Pick<MilestoneItem, 'mergeKey' | 'order'>): string {
  return `${launchId}:${item.mergeKey}:${item.order}`;
}

function applySelectedCandidate(
  item: MilestoneItem,
  selectedCandidateId?: string
): MilestoneItem {
  const selectedCandidate =
    item.candidates.find((candidate) => candidate.id === selectedCandidateId) ??
    item.candidates.find((candidate) => candidate.id === item.selectedCandidateId) ??
    item.candidates[0];

  if (!selectedCandidate) return item;

  return {
    ...item,
    id: selectedCandidate.id,
    name: selectedCandidate.name,
    startMs: selectedCandidate.startMs,
    endMs: selectedCandidate.endMs,
    durationMs: selectedCandidate.durationMs,
    operationType: selectedCandidate.operationType,
    evidence: selectedCandidate.evidence,
    category: selectedCandidate.category,
    representativeEvidence: selectedCandidate.evidence,
    selectedByUser: selectedCandidateId === selectedCandidate.id,
    selectedCandidateId: selectedCandidate.id,
  };
}

function buildMilestoneItems(
  stages: ColdStartStage[],
  launchId: string,
  stageSelections: Record<string, string>
): MilestoneItem[] {
  const grouped: MilestoneItem[] = [];

  for (const [index, stage] of stages.entries()) {
    const category = getStageCategory(stage);
    const candidate = {
      ...stage,
      category,
      order: index,
    };
    const key = `${stage.name}:${stage.operationType}:${category}`;
    const current = [...grouped]
      .reverse()
      .find((item) => (
        item.mergeKey === key &&
        stage.startMs <= item.endMs + MILESTONE_MERGE_WINDOW_MS
      ));

    if (!current) {
      grouped.push({
        ...stage,
        category,
        candidates: [candidate],
        count: 1,
        mergeKey: key,
        order: index,
        representativeEvidence: stage.evidence,
        selectedByUser: false,
        selectedCandidateId: stage.id,
        selectionKey: '',
      });
      continue;
    }

    current.count += 1;
    current.candidates.push(candidate);
    if (stage.durationMs >= current.durationMs) {
      current.id = stage.id;
      current.durationMs = stage.durationMs;
      current.startMs = stage.startMs;
      current.endMs = stage.endMs;
      current.representativeEvidence = stage.evidence;
      current.evidence = stage.evidence;
      current.selectedCandidateId = stage.id;
    }
  }

  return grouped
    .map((item) => {
      const selectionKey = getStageSelectionKey(launchId, item);
      return applySelectedCandidate(
        {
          ...item,
          candidates: [...item.candidates].sort((a, b) => a.startMs - b.startMs || a.order - b.order),
          selectionKey,
        },
        stageSelections[selectionKey]
      );
    })
    .sort((a, b) => a.startMs - b.startMs || a.order - b.order);
}

function formatMilestoneEvidence(item: MilestoneItem): string {
  return item.representativeEvidence;
}

function buildSyncTimelineSlots(items: MilestoneItem[], launchEndMs: number): SyncTimelineSlot[] {
  const syncItems = items.filter((item) => item.operationType === 'sync');
  const asyncItems = items.filter((item) => item.operationType === 'async');

  if (syncItems.length === 0) {
    return asyncItems.map((item) => ({
      sync: item,
      asyncItems: [],
    }));
  }

  const slots = syncItems.map((sync) => ({
    sync,
    asyncItems: [] as MilestoneItem[],
  }));

  for (const asyncItem of asyncItems) {
    const targetIndex = slots.findIndex((slot, index) => {
      const nextStartMs = slots[index + 1]?.sync.startMs ?? launchEndMs + 1;
      return asyncItem.startMs >= slot.sync.startMs && asyncItem.startMs < nextStartMs;
    });
    const fallbackIndex = asyncItem.startMs < slots[0].sync.startMs ? 0 : slots.length - 1;
    slots[targetIndex === -1 ? fallbackIndex : targetIndex].asyncItems.push(asyncItem);
  }

  return slots;
}

function StageCandidateButton({
  item,
  onResolve,
}: {
  item: MilestoneItem;
  onResolve?: (item: MilestoneItem) => void;
}) {
  if (item.candidates.length <= 1 || !onResolve) return null;

  return (
    <button
      className={`log-analysis-stage-candidate-button${item.selectedByUser ? ' is-confirmed' : ''}`}
      type="button"
      onClick={() => onResolve(item)}
    >
      {item.selectedByUser ? '已确认' : '确认日志'}
    </button>
  );
}

function MilestoneBadges({
  item,
  onResolve,
}: {
  item: MilestoneItem;
  onResolve?: (item: MilestoneItem) => void;
}) {
  return (
    <>
      <span className="log-analysis-milestone-duration">
        耗时 {formatGanttDuration(item.durationMs)}
      </span>
      <span className={`log-analysis-milestone-type is-${item.operationType}`}>
        {item.operationType === 'sync' ? '同步' : '异步'}
      </span>
      <span className={`log-analysis-milestone-category is-${item.category}`}>
        {GANTT_CATEGORY_LABELS[item.category]}
      </span>
      <StageCandidateButton item={item} onResolve={onResolve} />
    </>
  );
}

function MilestoneTimeline({
  launch,
  onResolve,
  stageSelections,
}: {
  launch: ColdStartLaunch;
  onResolve: (launch: ColdStartLaunch, item: MilestoneItem) => void;
  stageSelections: Record<string, string>;
}) {
  const items = buildMilestoneItems(launch.stages, launch.id, stageSelections);
  const slots = buildSyncTimelineSlots(items, launch.endMs);

  return (
    <div className="log-analysis-milestone-timeline">
      <div className="log-analysis-timeline-head">
        <span />
        <span />
        <strong>同步主线</strong>
        <strong>同时间段异步操作</strong>
      </div>
      {slots.map((slot) => {
        const evidence = formatMilestoneEvidence(slot.sync);

        return (
          <div
            className={`log-analysis-milestone-row ${slot.asyncItems.length > 0 ? 'has-async' : ''}`}
            key={`${slot.sync.id}-milestone`}
          >
            <time>{formatLogTime(slot.sync.startMs)}</time>
            <span className="log-analysis-milestone-dot is-sync" />
            <div className="log-analysis-milestone-content">
              <div className="log-analysis-milestone-main">
                <strong title={slot.sync.evidence}>{slot.sync.name}</strong>
                <MilestoneBadges item={slot.sync} onResolve={(item) => onResolve(launch, item)} />
              </div>
              {evidence && (
                <p title={evidence}>{evidence}</p>
              )}
            </div>
            {slot.asyncItems.length > 0 && (
              <div className="log-analysis-async-branch">
                {slot.asyncItems.map((item) => {
                  const asyncEvidence = formatMilestoneEvidence(item);

                  return (
                    <div className="log-analysis-async-item" key={`${item.id}-async`}>
                      <div className="log-analysis-async-main">
                        <span className="log-analysis-async-time">{formatLogTime(item.startMs)}</span>
                        <span className="log-analysis-async-dot" />
                        <strong title={item.evidence}>{item.name}</strong>
                        <MilestoneBadges item={item} onResolve={(nextItem) => onResolve(launch, nextItem)} />
                      </div>
                      {asyncEvidence && <p title={asyncEvidence}>{asyncEvidence}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GanttAxis({ scaleMaxMs }: { scaleMaxMs: number }) {
  return (
    <div className="log-analysis-gantt-axis">
      <div />
      <div className="log-analysis-gantt-axis-track">
        {buildScaleTicks(scaleMaxMs).map((tick) => (
          <span
            key={tick}
            style={{ left: `${(tick * 1000 / scaleMaxMs) * 100}%` }}
          >
            {tick}s
          </span>
        ))}
      </div>
    </div>
  );
}

function GanttBar({ item, launch, onResolve, scaleMaxMs }: {
  item: MilestoneItem;
  launch: ColdStartLaunch;
  onResolve: (launch: ColdStartLaunch, item: MilestoneItem) => void;
  scaleMaxMs: number;
}) {
  const relativeStart = Math.max(0, item.startMs - launch.startMs);
  const left = Math.max(0, (relativeStart / scaleMaxMs) * 100);
  const width = Math.min(100 - left, Math.max(1.4, (item.durationMs / scaleMaxMs) * 100));
  const evidence = formatMilestoneEvidence(item);

  return (
    <div className={`log-analysis-gantt-row is-${item.operationType}`}>
      <div className="log-analysis-gantt-meta">
        <strong title={item.name}>{item.name}</strong>
        <span>
          {formatLogTime(item.startMs)} · {item.operationType === 'sync' ? '同步' : '异步'}
        </span>
      </div>
      <div className="log-analysis-gantt-track">
        <div
          className={`log-analysis-gantt-bar is-${item.operationType}`}
          style={{ left: `${left}%`, width: `${width}%` }}
          title={`${item.name} / ${formatLogTime(item.startMs)} / ${formatDuration(item.durationMs)}`}
        />
        <span
          className="log-analysis-gantt-duration"
          style={{ left: `${Math.min(98, left + width)}%` }}
        >
          {formatGanttDuration(item.durationMs)}
        </span>
      </div>
      <div className="log-analysis-gantt-info">
        <div className="log-analysis-gantt-badges">
          <span className={`log-analysis-milestone-category is-${item.category}`}>
            {GANTT_CATEGORY_LABELS[item.category]}
          </span>
          <StageCandidateButton item={item} onResolve={(nextItem) => onResolve(launch, nextItem)} />
        </div>
        <p title={evidence}>{evidence}</p>
      </div>
    </div>
  );
}

function GanttChart({
  launch,
  onResolve,
  stageSelections,
}: {
  launch: ColdStartLaunch;
  onResolve: (launch: ColdStartLaunch, item: MilestoneItem) => void;
  stageSelections: Record<string, string>;
}) {
  const items = buildMilestoneItems(launch.stages, launch.id, stageSelections);
  const scaleMaxMs = getScaleMaxMs(launch, items);

  return (
    <div className="log-analysis-gantt">
      <GanttAxis scaleMaxMs={scaleMaxMs} />
      {items.map((item) => (
        <GanttBar
          item={item}
          key={`${item.id}-gantt`}
          launch={launch}
          onResolve={onResolve}
          scaleMaxMs={scaleMaxMs}
        />
      ))}
      <div className="log-analysis-gantt-legend">
        <span><i className="is-sync" />同步操作</span>
        <span><i className="is-async" />异步操作</span>
      </div>
    </div>
  );
}

function StageCandidateDialog({
  onClose,
  onSelect,
  prompt,
}: {
  onClose: () => void;
  onSelect: (selectionKey: string, candidateId: string) => void;
  prompt: StageSelectionPrompt | null;
}) {
  if (!prompt) return null;

  return (
    <div className="log-analysis-stage-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="log-analysis-stage-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{prompt.launchTitle}</span>
            <strong>确认「{prompt.stageName}」对应日志</strong>
          </div>
          <button aria-label="关闭" type="button" onClick={onClose}>×</button>
        </header>
        <div className="log-analysis-stage-candidate-list">
          {prompt.candidates.map((candidate) => (
            <button
              className={`log-analysis-stage-candidate-option${
                candidate.id === prompt.selectedCandidateId ? ' is-selected' : ''
              }`}
              key={candidate.id}
              type="button"
              onClick={() => onSelect(prompt.selectionKey, candidate.id)}
            >
              <span className="log-analysis-stage-candidate-meta">
                <time>{formatLogTime(candidate.startMs)}</time>
                <span>{formatDuration(candidate.durationMs)}</span>
                <span>{candidate.operationType === 'sync' ? '同步' : '异步'}</span>
                <span>{GANTT_CATEGORY_LABELS[candidate.category]}</span>
              </span>
              <strong>{candidate.name}</strong>
              <p>{candidate.evidence}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GanttSection({ report }: { report: LogAnalysisReport }) {
  const [viewMode, setViewMode] = useState<ColdStartViewMode>('timeline');
  const [stageSelections, setStageSelections] = useState<Record<string, string>>({});
  const [stagePrompt, setStagePrompt] = useState<StageSelectionPrompt | null>(null);

  useEffect(() => {
    setStageSelections({});
    setStagePrompt(null);
  }, [report.analyzedAt, report.fileName]);

  const unresolvedStage = useMemo(() => {
    for (const launch of report.launches) {
      const item = buildMilestoneItems(launch.stages, launch.id, stageSelections)
        .find((stage) => stage.candidates.length > 1 && !stage.selectedByUser);
      if (item) return { launch, item };
    }
    return null;
  }, [report.launches, stageSelections]);

  const openStagePrompt = useCallback((launch: ColdStartLaunch, item: MilestoneItem) => {
    setStagePrompt({
      candidates: item.candidates,
      launchTitle: launch.title,
      selectedCandidateId: item.selectedCandidateId,
      selectionKey: item.selectionKey,
      stageName: item.name,
    });
  }, []);

  const handleSelectStageCandidate = (selectionKey: string, candidateId: string) => {
    setStageSelections((current) => ({
      ...current,
      [selectionKey]: candidateId,
    }));
    setStagePrompt(null);
  };

  return (
    <>
      <Section
        title="冷启流程图"
        subtitle={viewMode === 'timeline'
          ? '同步主线 · 右侧展示同时间段异步分支，共用左侧时间轴'
          : '横轴 = 距进程启动的秒数 · 条形右侧标注阶段耗时'}
        variant="diagnostic"
        extra={(
          <div className="log-analysis-view-switch">
            <Segmented
              options={[
                { label: '时间线', value: 'timeline' },
                { label: '甘特图', value: 'gantt' },
              ]}
              size="small"
              value={viewMode}
              onChange={(nextValue) => setViewMode(nextValue as ColdStartViewMode)}
            />
            <Tag className="log-analysis-diagnostic-pill">冷启流程</Tag>
          </div>
        )}
      >
        {unresolvedStage && (
          <div className="log-analysis-stage-confirm-card">
            <span>有阶段存在多条候选日志，请确认真正对应的日志。</span>
            <button
              type="button"
              onClick={() => openStagePrompt(unresolvedStage.launch, unresolvedStage.item)}
            >
              确认阶段日志
            </button>
          </div>
        )}
        {report.launches.length === 0 ? (
          <Empty description="未识别到 App Start 冷启会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="log-analysis-launch-list">
            {report.launches.map((launch) => (
              <article className="log-analysis-launch is-timeline" key={launch.id}>
                {report.launches.length > 1 && (
                  <div className="log-analysis-launch-head">
                    <div>
                      <strong>{launch.title}</strong>
                      <span>{formatLogTime(launch.startMs)} 开始</span>
                    </div>
                    <Tag>{formatDuration(launch.durationMs)}</Tag>
                  </div>
                )}
                {viewMode === 'timeline'
                  ? (
                    <MilestoneTimeline
                      launch={launch}
                      stageSelections={stageSelections}
                      onResolve={openStagePrompt}
                    />
                  )
                  : (
                    <GanttChart
                      launch={launch}
                      stageSelections={stageSelections}
                      onResolve={openStagePrompt}
                    />
                  )}
              </article>
            ))}
          </div>
        )}
      </Section>
      <StageCandidateDialog
        prompt={stagePrompt}
        onClose={() => setStagePrompt(null)}
        onSelect={handleSelectStageCandidate}
      />
    </>
  );
}

function StageRankingTable({ rows }: { rows: StageRankingItem[] }) {
  if (rows.length === 0) {
    return <Empty description="暂无可排序的启动阶段" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="log-analysis-table-wrap">
      <table className="log-analysis-table">
        <colgroup>
          <col className="log-analysis-table-col-stage" />
          <col className="log-analysis-table-col-type" />
          <col className="log-analysis-table-col-duration" />
        </colgroup>
        <thead>
          <tr>
            <th>阶段</th>
            <th>类型</th>
            <th>耗时</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.name}-${row.operationType}`}>
              <td>
                <span title={row.evidence}>{row.name}</span>
              </td>
              <td><OperationTag type={row.operationType} /></td>
              <td>{formatDuration(row.averageMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriorityTag({ priority }: { priority: AiBottleneck['priority'] }) {
  return <Tag className={`log-analysis-priority is-${priority.toLowerCase()}`}>{priority}</Tag>;
}

function BottleneckList({ bottlenecks }: { bottlenecks: AiBottleneck[] }) {
  if (bottlenecks.length === 0) {
    return <Empty description="AI 未识别到明确瓶颈" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="log-analysis-issue-list">
      {bottlenecks.map((item, index) => (
        <article
          className={`log-analysis-issue is-${item.priority.toLowerCase()}`}
          key={`${item.priority}-${item.title}-${index}`}
        >
          <div className="log-analysis-issue-title">
            <PriorityTag priority={item.priority} />
            <strong>{item.title}</strong>
          </div>
          {item.stageName && <p><span>关联阶段</span>：{item.stageName}</p>}
          {item.impact && <p>{item.impact}</p>}
          {item.evidence && <p className="log-analysis-evidence">{item.evidence}</p>}
          <p className="log-analysis-suggestion">建议：{item.suggestion}</p>
        </article>
      ))}
    </div>
  );
}

function ColdStartAnalysisSection({ report }: { report: LogAnalysisReport }) {
  const showAi = report.mode === 'ai' && report.ai;

  return (
    <Section title="冷启流程分析">
      <div className="log-analysis-subsection">
        <Typography.Title level={5}>启动阶段耗时排序</Typography.Title>
        <StageRankingTable rows={report.stageRanking} />
      </div>
      {showAi && (
        <div className="log-analysis-subsection is-diagnostic">
          <Typography.Title level={5}>瓶颈问题分析</Typography.Title>
          {report.ai?.coldStartSummary && (
            <p className="log-analysis-ai-summary">{report.ai.coldStartSummary}</p>
          )}
          <BottleneckList bottlenecks={report.ai?.bottlenecks ?? []} />
        </div>
      )}
    </Section>
  );
}

function NetworkEventList({ events }: { events: NetworkEvent[] }) {
  if (events.length === 0) {
    return <Empty description="未识别到网络相关日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="log-analysis-network-events">
      {events.map((event) => (
        <div className={`log-analysis-network-event is-${event.level}`} key={event.id}>
          <span>{formatLogTime(event.timeMs)}</span>
          <Tag>{event.category}</Tag>
          <p>{event.description}</p>
        </div>
      ))}
    </div>
  );
}

function NetworkIssueList({ issues }: { issues: AiNetworkIssue[] }) {
  if (issues.length === 0) {
    return <Empty description="AI 未识别到明确网络风险" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="log-analysis-issue-list">
      {issues.map((item, index) => (
        <article
          className={`log-analysis-issue is-${item.priority.toLowerCase()}`}
          key={`${item.priority}-${item.title}-${index}`}
        >
          <div className="log-analysis-issue-title">
            <PriorityTag priority={item.priority} />
            <strong>{item.title}</strong>
          </div>
          {item.evidence && <p className="log-analysis-evidence">{item.evidence}</p>}
          <p className="log-analysis-suggestion">建议：{item.suggestion}</p>
        </article>
      ))}
    </div>
  );
}

function findNetworkDescription(report: LogAnalysisReport, pattern: RegExp): string {
  return report.network.descriptions.find((description) => pattern.test(description)) ?? '';
}

function getNetworkStat(report: LogAnalysisReport, label: string) {
  return report.network.stats.find((item) => item.label === label);
}

function getDnsMetric(detail?: string): string {
  return detail?.split('/')[0]?.trim() || 'DNS 0';
}

function formatPercent(value: number): string {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

function getLayerLabel(layer: NetworkFailureLayer): string {
  return layer === 'network' ? '网络层' : '业务层';
}

function NetworkDiagnosisCards({ report }: { report: LogAnalysisReport }) {
  const latency = getNetworkStat(report, '平均延迟');
  const maxLatency = getNetworkStat(report, '最大延迟');
  const errors = getNetworkStat(report, '异常日志');
  const connectivity = getNetworkStat(report, '连通性事件');
  const topEndpoint = report.network.endpoints[0]?.endpoint;
  const cards = [
    {
      icon: <FieldTimeOutlined />,
      title: '延迟表现',
      value: latency?.value ?? '无样本',
      meta: latency?.detail ?? maxLatency?.detail,
      detail: findNetworkDescription(report, /延迟|样本/),
      status: latency?.status ?? 'good',
    },
    {
      icon: <GlobalOutlined />,
      title: 'DNS 解析',
      value: getDnsMetric(errors?.detail),
      meta: errors?.value,
      detail: findNetworkDescription(report, /DNS|域名|HttpDNS/),
      status: errors?.status ?? 'good',
    },
    {
      icon: <DisconnectOutlined />,
      title: '连通性',
      value: connectivity?.value ?? '0 条',
      meta: connectivity?.detail,
      detail: findNetworkDescription(report, /连通性|offline|网络错误页/),
      status: connectivity?.status ?? 'good',
    },
    {
      icon: <ApiOutlined />,
      title: '高频端点',
      value: `${report.network.endpoints.length} 个`,
      meta: topEndpoint,
      detail: findNetworkDescription(report, /高频接口|端点|接口请求/),
      status: report.network.endpoints.some((endpoint) => endpoint.errorCount > 0) ? 'warn' : 'good',
    },
  ];

  return (
    <div className="log-analysis-network-diagnosis">
      <div className="log-analysis-network-diagnosis-head">
        <div>
          <Typography.Title level={5}>离线诊断结论</Typography.Title>
          <span>基于网络快照、延迟样本、异常日志和端点统计整理</span>
        </div>
      </div>
      <div className="log-analysis-network-diagnosis-grid">
        {cards.map((card) => (
          <article className={`log-analysis-network-diagnosis-card is-${card.status}`} key={card.title}>
            <div className="log-analysis-network-diagnosis-title">
              {card.icon}
              <strong>{card.title}</strong>
            </div>
            <div className="log-analysis-network-diagnosis-value">
              <strong>{card.value}</strong>
              {card.meta && <span title={card.meta}>{card.meta}</span>}
            </div>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function NetworkLayerRatio({ report }: { report: LogAnalysisReport }) {
  const { layerSummary } = report.network;
  const networkLabel = `网络层 ${layerSummary.networkCount} · ${formatPercent(layerSummary.networkRatio)}`;
  const businessLabel = `业务层 ${layerSummary.businessCount} · ${formatPercent(layerSummary.businessRatio)}`;
  const networkCompact = layerSummary.networkRatio < 14;
  const businessCompact = layerSummary.businessRatio < 14;

  return (
    <div className="log-analysis-network-block">
      <div className="log-analysis-network-block-head">
        <Typography.Title level={5}>网络层 vs 业务层占比</Typography.Title>
        <span>{layerSummary.totalCount} 次失败按层归类</span>
      </div>
      {layerSummary.totalCount === 0 ? (
        <div className="log-analysis-network-empty-state">未识别到明确的网络层或业务层失败码。</div>
      ) : (
        <>
          <div className="log-analysis-layer-ratio-bar">
            {layerSummary.networkCount > 0 && (
              <span
                aria-hidden="true"
                className="log-analysis-layer-ratio-segment is-network"
                style={{ width: `${layerSummary.networkRatio}%` }}
              />
            )}
            {layerSummary.businessCount > 0 && (
              <span
                aria-hidden="true"
                className="log-analysis-layer-ratio-segment is-business"
                style={{ width: `${layerSummary.businessRatio}%` }}
              />
            )}
            {layerSummary.networkCount > 0 && (
              <strong
                className={`log-analysis-layer-ratio-label is-network${networkCompact ? ' is-compact' : ''}`}
                style={networkCompact ? { left: 12 } : { left: `${layerSummary.networkRatio / 2}%` }}
              >
                {networkLabel}
              </strong>
            )}
            {layerSummary.businessCount > 0 && (
              <strong
                className={`log-analysis-layer-ratio-label is-business${businessCompact ? ' is-compact' : ''}`}
                style={
                  businessCompact
                    ? { right: 12 }
                    : { left: `${layerSummary.networkRatio + layerSummary.businessRatio / 2}%` }
                }
              >
                {businessLabel}
              </strong>
            )}
          </div>
          <div className="log-analysis-layer-legend">
            <span><i className="is-network" />网络层错误（ERR_ / DNS / timeout / offline）</span>
            <span><i className="is-business" />业务层错误（HTTP 状态码 / 业务码）</span>
          </div>
        </>
      )}
    </div>
  );
}

function NetworkFailureDistribution({ reasons }: { reasons: NetworkFailureReasonStat[] }) {
  if (reasons.length === 0) return null;
  const maxCount = Math.max(...reasons.map((reason) => reason.count), 1);

  return (
    <div className="log-analysis-network-block">
      <div className="log-analysis-network-block-head">
        <Typography.Title level={5}>失败原因分布</Typography.Title>
        <span>条形长度 = 出现次数占比</span>
      </div>
      <div className="log-analysis-failure-bars">
        {reasons.slice(0, 8).map((reason) => (
          <div className="log-analysis-failure-bar-row" key={reason.code}>
            <span className="log-analysis-failure-code" title={reason.label}>{reason.label}</span>
            <div className="log-analysis-failure-track">
              <span
                className={`is-${reason.layer}`}
                style={{ width: `${Math.max(7, (reason.count / maxCount) * 100)}%` }}
              >
                {reason.count} 次
              </span>
            </div>
            <span className="log-analysis-failure-percent">{formatPercent(reason.ratio)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkFailureDetails({ reasons }: { reasons: NetworkFailureReasonStat[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="log-analysis-network-block">
      <div className="log-analysis-network-block-head">
        <Typography.Title level={5}>失败明细</Typography.Title>
        <span>按错误码归类</span>
      </div>
      <div className="log-analysis-network-table-wrap">
        <table className="log-analysis-network-table">
          <thead>
            <tr>
              <th>错误码</th>
              <th>层级</th>
              <th>次数</th>
              <th>占比</th>
              <th>典型场景 / 根因</th>
            </tr>
          </thead>
          <tbody>
            {reasons.slice(0, 10).map((reason) => (
              <tr key={reason.code}>
                <td><code>{reason.label}</code></td>
                <td>
                  <span className={`log-analysis-layer-tag is-${reason.layer}`}>
                    {getLayerLabel(reason.layer)}
                  </span>
                </td>
                <td>{reason.count}</td>
                <td>{formatPercent(reason.ratio)}</td>
                <td title={reason.example}>{reason.scenario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StartupNetworkResults({ results }: { results: StartupNetworkResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="log-analysis-network-block">
      <div className="log-analysis-network-block-head">
        <Typography.Title level={5}>首屏加载结果</Typography.Title>
        <span>按 {results.length} 次启动会话</span>
      </div>
      <div className="log-analysis-network-table-wrap">
        <table className="log-analysis-network-table is-startup">
          <thead>
            <tr>
              <th>#</th>
              <th>启动时间</th>
              <th>Horn / 配置</th>
              <th>首屏结果</th>
              <th>失败错误码 / 说明</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.launchId}>
                <td>{item.index}</td>
                <td>{formatLogTime(item.startMs)}</td>
                <td>{item.context}</td>
                <td>
                  <span className={`log-analysis-startup-result is-${item.result}`}>
                    {item.result === 'success'
                      ? <CheckCircleOutlined />
                      : item.result === 'failed'
                        ? <CloseCircleOutlined />
                        : null}
                    {item.result === 'success' ? '成功' : item.result === 'failed' ? '失败' : '未知'}
                  </span>
                </td>
                <td>{item.failureCode ? `${item.failureCode}：${item.detail}` : item.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NetworkFailureInsightSection({ report }: { report: LogAnalysisReport }) {
  return (
    <div className="log-analysis-network-insights">
      <NetworkLayerRatio report={report} />
      <NetworkFailureDistribution reasons={report.network.failureReasons} />
      <NetworkFailureDetails reasons={report.network.failureReasons} />
      <StartupNetworkResults results={report.network.startupResults} />
    </div>
  );
}

function NetworkAnalysisSection({ report }: { report: LogAnalysisReport }) {
  const showAi = report.mode === 'ai' && report.ai;

  return (
    <Section title="网络状态分析">
      <MetricGrid items={report.network.stats} />
      <NetworkDiagnosisCards report={report} />
      <NetworkFailureInsightSection report={report} />
      {showAi && (
        <div className="log-analysis-subsection is-diagnostic">
          <Typography.Title level={5}>AI 网络判断</Typography.Title>
          {report.ai?.networkSummary && (
            <p className="log-analysis-ai-summary">{report.ai.networkSummary}</p>
          )}
          <NetworkIssueList issues={report.ai?.networkIssues ?? []} />
        </div>
      )}
      <div className="log-analysis-subsection">
        <Typography.Title level={5}>关键网络日志</Typography.Title>
        <NetworkEventList events={report.network.events} />
      </div>
    </Section>
  );
}

function ReportPanel({ report }: { report: LogAnalysisReport | null }) {
  if (!report) {
    return (
      <div className="log-analysis-empty-report">
        <Empty description="选择日志后自动生成分析报告" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="log-analysis-report">
      {report.aiError && (
        <Alert
          className="log-analysis-report-alert"
          title="AI 分析未完成，已展示离线结果"
          description={report.aiError}
          type="warning"
          showIcon
        />
      )}
      <DeviceInfoSection report={report} />
      <GanttSection report={report} />
      <ColdStartAnalysisSection report={report} />
      <NetworkAnalysisSection report={report} />
    </div>
  );
}

const LogAnalysisPage: React.FC<LogAnalysisPageProps> = ({ active, droppedFile }) => {
  const [mode, setMode] = useState<LogAnalysisMode>('ai');
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<LogAnalysisReport | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ParseProgress>({ bytesRead: 0, lineCount: 0 });
  const [busyText, setBusyText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runIdRef = useRef(0);
  const handledDroppedFileIdRef = useRef<number | null>(null);
  const { message } = App.useApp();
  const { loadModels, loadSettings, settings } = useChatStore();

  useEffect(() => {
    loadModels();
    loadSettings();
  }, [loadModels, loadSettings]);

  useEffect(() => {
    if (!active) setDragging(false);
  }, [active]);

  const progressPercent = useMemo(() => {
    if (!file?.size) return 0;
    return Math.min(100, Math.round((progress.bytesRead / file.size) * 100));
  }, [file?.size, progress.bytesRead]);
  const aiConfigured = Boolean(settings.apiKey && settings.baseUrl && settings.model);

  const addAiAnalysis = useCallback(async (baseReport: LogAnalysisReport, runId: number) => {
    setBusyText('读取 AI 配置');
    await Promise.all([loadModels(), loadSettings()]);
    if (runIdRef.current !== runId) return;

    if (!isAiConfigured('ai')) {
      setReport((current) => ({
        ...(current ?? baseReport),
        mode: 'ai',
        aiError: 'AI 配置未完成，请先前往设置页配置模型、Base URL 和 API Key。',
      }));
      return;
    }

    const { settings, models, skills } = useChatStore.getState();
    const config = getEffectiveChatConfig(settings, models, skills);
    setBusyText('AI 分析冷启流程');
    const ai = await runAiLogAnalysis(baseReport, config, (step) => {
      if (runIdRef.current !== runId) return;
      setBusyText(step === 'cold-start' ? 'AI 分析冷启流程' : 'AI 分析网络状态');
    });
    if (runIdRef.current !== runId) return;

    setReport((current) => ({
      ...(current ?? baseReport),
      mode: 'ai',
      ai,
      aiError: undefined,
    }));
  }, [loadModels, loadSettings]);

  const runAnalysis = useCallback(async (selectedFile: File, selectedMode: LogAnalysisMode) => {
    if (!isLogFile(selectedFile)) {
      message.warning('请选择 .log 文件');
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setFile(selectedFile);
    setReport(null);
    setProgress({ bytesRead: 0, lineCount: 0 });
    setAnalyzing(true);
    setBusyText('离线解析中');

    try {
      const localReport = await parseLogFile(selectedFile, (nextProgress) => {
        if (runIdRef.current !== runId) return;
        setProgress(nextProgress);
      });
      if (runIdRef.current !== runId) return;

      const nextReport: LogAnalysisReport = {
        ...localReport,
        mode: selectedMode,
      };
      setReport(nextReport);

      if (selectedMode === 'offline') {
        setBusyText('');
        setAnalyzing(false);
        return;
      }

      await addAiAnalysis(nextReport, runId);
      if (runIdRef.current !== runId) return;
      setBusyText('');
      setAnalyzing(false);
    } catch (error) {
      if (runIdRef.current !== runId) return;
      setReport((current) => current ? {
        ...current,
        aiError: error instanceof Error ? error.message : String(error),
      } : null);
      message.error(error instanceof Error ? error.message : '日志分析失败');
      setBusyText('');
      setAnalyzing(false);
    }
  }, [addAiAnalysis, message]);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    runAnalysis(selectedFile, mode);
  };

  useEffect(() => {
    if (!droppedFile || handledDroppedFileIdRef.current === droppedFile.id) return;

    handledDroppedFileIdRef.current = droppedFile.id;
    setDragging(false);
    runAnalysis(droppedFile.file, mode);
  }, [droppedFile, mode, runAnalysis]);

  const handleModeChange = (nextMode: LogAnalysisMode) => {
    setMode(nextMode);
    if (!file) return;

    if (!report) {
      runAnalysis(file, nextMode);
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    if (nextMode === 'offline') {
      setReport({
        ...report,
        mode: 'offline',
        aiError: undefined,
      });
      setBusyText('');
      setAnalyzing(false);
      return;
    }

    setReport({
      ...report,
      mode: 'ai',
      aiError: undefined,
    });

    if (report.ai) {
      setBusyText('');
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    addAiAnalysis({ ...report, mode: 'ai', aiError: undefined }, runId)
      .catch((error: unknown) => {
        if (runIdRef.current !== runId) return;
        setReport((current) => current ? {
          ...current,
          mode: 'ai',
          aiError: error instanceof Error ? error.message : String(error),
        } : current);
        message.error(error instanceof Error ? error.message : 'AI 分析失败');
      })
      .finally(() => {
        if (runIdRef.current !== runId) return;
        setBusyText('');
        setAnalyzing(false);
      });
  };

  const clearReport = () => {
    runIdRef.current += 1;
    setFile(null);
    setReport(null);
    setProgress({ bytesRead: 0, lineCount: 0 });
    setBusyText('');
    setAnalyzing(false);
  };

  return (
    <section className={`log-analysis-page${active ? ' is-active' : ''}`}>
      <aside className="log-analysis-control">
        <div className="log-analysis-control-head">
          <span className="log-analysis-title-line">
            <BarChartOutlined />
            <Typography.Title level={3}>日志分析</Typography.Title>
          </span>
          <Typography.Paragraph type="secondary">
            冷启链路、设备状态与网络异常
          </Typography.Paragraph>
        </div>

        <Segmented<LogAnalysisMode>
          block
          className="log-analysis-mode"
          options={[
            { label: 'AI 模式', value: 'ai', icon: <CloudSyncOutlined /> },
            { label: '离线模式', value: 'offline', icon: <ThunderboltOutlined /> },
          ]}
          value={mode}
          onChange={handleModeChange}
        />

        <LogAnalysisAiSettingsCard
          configured={aiConfigured}
          onOpen={() => void window.cinnaAPI?.openAISettings?.()}
        />

        <div
          className={`log-analysis-drop-zone${dragging ? ' is-dragging' : ''}`}
          data-log-analysis-drop-zone="true"
          onDragEnter={(event) => {
            stopLogDropEvent(event);
            setDragging(true);
          }}
          onDragOver={(event) => {
            stopLogDropEvent(event);
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(event) => {
            stopLogDropEvent(event);
            setDragging(false);
          }}
          onDrop={(event) => {
            stopLogDropEvent(event);
            setDragging(false);
            selectFile(event.dataTransfer.files[0]);
          }}
        >
          <FileTextOutlined />
          <strong>{file?.name ?? '拖入 .log 文件'}</strong>
          <span>{file ? `${formatBytes(file.size)} · ${progress.lineCount.toLocaleString()} 行` : '文件载入后自动分析'}</span>
          <Button
            icon={<UploadOutlined />}
            onClick={() => inputRef.current?.click()}
            type="primary"
          >
            选择日志
          </Button>
          <input
            ref={inputRef}
            accept=".log"
            className="log-analysis-file-input"
            type="file"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>

        <div className="log-analysis-progress-card">
          <div className="log-analysis-progress-head">
            <span>{analyzing ? busyText || '分析中' : report ? '分析完成' : '等待日志'}</span>
            {analyzing && <Spin size="small" />}
          </div>
          <Progress percent={progressPercent} size="small" />
          <span className="log-analysis-progress-meta">
            已读取 {formatBytes(progress.bytesRead)} / {file ? formatBytes(file.size) : '0 B'}
          </span>
        </div>

        {report && (
          <div className="log-analysis-run-meta">
            <Tag>{report.mode === 'ai' ? 'AI 模式' : '离线模式'}</Tag>
            <Tag>{report.launches.length} 次冷启</Tag>
            <Tag>{report.network.events.length} 条网络线索</Tag>
          </div>
        )}

        <Alert
          className="log-analysis-privacy-note"
          title="隐私边界"
          description={report?.privacyNote ?? 'AI 模式只会发送脱敏后的结构化摘要。'}
          type="info"
          showIcon
        />

        {(file || report) && (
          <Button block onClick={clearReport}>
            清空
          </Button>
        )}
      </aside>

      <main className="log-analysis-main">
        <ReportPanel report={report} />
      </main>
    </section>
  );
};

export default LogAnalysisPage;
