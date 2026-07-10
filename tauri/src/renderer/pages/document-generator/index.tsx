import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Input, Radio, Tag } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamChat, stopGeneration, type ChatConfig } from '@/shared/services/aiService';
import { defaultSettings, getEffectiveChatConfig, normalizeSettings } from '@/shared/store/chat/settings';
import type { ChatSettings } from '@/shared/store/chat/types';
import type { ModelInfo } from '@/shared/types/platform';
import './index.css';

const { TextArea } = Input;

type GenerationMode = 'reflection' | null;
type RequirementListKey = 'businessItems' | 'technicalItems';
type SummaryKind = 'fullYear' | 'halfYear';

const SAVED_PATH_VISIBLE_MS = 2000;

interface RequirementItem {
  id: string;
  name: string;
  link: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  highlights: string;
  shortcomings: string;
}

interface PlanItem {
  id: string;
  problem: string;
  approach: string;
  effect: string;
}

interface SuggestionItem {
  id: string;
  problem: string;
  suggestion: string;
  support: string;
}

interface ReviewFormState {
  summaryKind: SummaryKind;
  year: string;
  roleSummary: string;
  demandSummary: string;
  processQuality: string;
  onlineQuality: string;
  businessItems: RequirementItem[];
  technicalItems: RequirementItem[];
  plans: PlanItem[];
  suggestions: SuggestionItem[];
  reflection: string;
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
}

interface RequirementSectionProps {
  title: string;
  items: RequirementItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<RequirementItem>) => void;
}

interface PlanSectionProps {
  title: string;
  items: PlanItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<PlanItem>) => void;
}

interface SuggestionSectionProps {
  items: SuggestionItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<SuggestionItem>) => void;
}

interface DocumentGeneratorPageProps {
  active: boolean;
}

const REFLECTION_SYSTEM_PROMPT = [
  '你是资深述职材料编辑，只负责根据脱敏材料生成工作总结的总结与反思。',
  '不要编造精确数据；缺少数据时保留 XX 或“待补充”。',
  '避免空泛套话，重点分析成长、问题、改进方向和团队协作。',
].join('\n');

const SUMMARY_KIND_OPTIONS: Array<{ label: string; value: SummaryKind }> = [
  { label: '全年总结', value: 'fullYear' },
  { label: '半年总结', value: 'halfYear' },
];

const REQUIREMENT_FIELDS: Array<{
  key: keyof Omit<RequirementItem, 'id'>;
  label: string;
  placeholder: string;
  rows: number;
}> = [
  {
    key: 'situation',
    label: 'S - Situation 背景问题',
    placeholder: '为什么做、当时的业务/技术背景、痛点是什么',
    rows: 3,
  },
  {
    key: 'task',
    label: 'T - Task 目标职责',
    placeholder: '目标是什么、自己负责哪部分、成功标准是什么',
    rows: 3,
  },
  {
    key: 'action',
    label: 'A - Action 关键行动',
    placeholder: '具体方案、技术实现、协作推进、质量保障',
    rows: 4,
  },
  {
    key: 'result',
    label: 'R - Result 结果产出',
    placeholder: '上线结果、业务指标、质量指标、沉淀复用、影响范围',
    rows: 4,
  },
  {
    key: 'highlights',
    label: '亮点',
    placeholder: '高复用、Owner 意识、工程质量、复杂问题突破等',
    rows: 3,
  },
  {
    key: 'shortcomings',
    label: '不足 / 复盘 / 后续改进',
    placeholder: '遗漏、缺陷、沟通、验证不足，以及下一步怎么改',
    rows: 3,
  },
];

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRequirementItem(name = ''): RequirementItem {
  return {
    id: createId(),
    name,
    link: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    highlights: '',
    shortcomings: '',
  };
}

function createPlanItem(): PlanItem {
  return {
    id: createId(),
    problem: '',
    approach: '',
    effect: '',
  };
}

function createSuggestionItem(): SuggestionItem {
  return {
    id: createId(),
    problem: '',
    suggestion: '',
    support: '',
  };
}

function createInitialForm(): ReviewFormState {
  const year = String(new Date().getFullYear());
  return {
    summaryKind: 'fullYear',
    year,
    roleSummary: '',
    demandSummary: '',
    processQuality: '',
    onlineQuality: '',
    businessItems: [createRequirementItem()],
    technicalItems: [createRequirementItem()],
    plans: [createPlanItem()],
    suggestions: [createSuggestionItem()],
    reflection: '',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasRequirementContent(item: RequirementItem): boolean {
  return [
    item.name,
    item.link,
    item.situation,
    item.task,
    item.action,
    item.result,
    item.highlights,
    item.shortcomings,
  ].some(hasText);
}

function hasPlanContent(item: PlanItem): boolean {
  return [item.problem, item.approach, item.effect].some(hasText);
}

function hasSuggestionContent(item: SuggestionItem): boolean {
  return [item.problem, item.suggestion, item.support].some(hasText);
}

function hasFormContent(form: ReviewFormState): boolean {
  return [
    form.roleSummary,
    form.demandSummary,
    form.processQuality,
    form.onlineQuality,
    form.reflection,
  ].some(hasText) ||
    form.businessItems.some(hasRequirementContent) ||
    form.technicalItems.some(hasRequirementContent) ||
    form.plans.some(hasPlanContent) ||
    form.suggestions.some(hasSuggestionContent);
}

function display(value: string): string {
  return value.trim() || '未填写';
}

function markdownCell(value: string): string {
  const normalized = display(value)
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim())
    .filter(Boolean)
    .join('<br />');

  return normalized || '未填写';
}

function renderMarkdownLineBreaks(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return children.split(/<br\s*\/?>/gi).flatMap((part, index) => (
      index === 0 ? [part] : [<br key={`br-${index}`} />, part]
    ));
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>
        {renderMarkdownLineBreaks(child)}
      </React.Fragment>
    ));
  }

  return children;
}

function getNextYear(year: string): string {
  const numericYear = Number(year.trim());
  return Number.isFinite(numericYear) && numericYear > 0
    ? String(numericYear + 1)
    : '下一年度';
}

function getSummaryKindLabel(kind: SummaryKind): string {
  return kind === 'halfYear' ? '半年总结' : '全年总结';
}

function getWorkSummaryTitle(form: ReviewFormState): string {
  const year = display(form.year);
  return form.summaryKind === 'halfYear'
    ? `${year} 年半年工作总结`
    : `${year} 年全年工作总结`;
}

function getPlanPeriodLabel(form: ReviewFormState): string {
  if (form.summaryKind === 'halfYear') {
    return '下半年';
  }

  const nextYear = getNextYear(form.year);
  return nextYear === '下一年度' ? nextYear : `${nextYear} 年`;
}

function getPlanSectionTitle(form: ReviewFormState): string {
  return `${getPlanPeriodLabel(form)}规划`;
}

function formatRequirementProblemCell(item: RequirementItem): string {
  const title = hasText(item.name) ? `**${item.name.trim()}**` : '';
  const link = hasText(item.link) ? `PRD 链接：${item.link.trim()}` : '';
  return [
    title,
    link,
    `【Situation】${display(item.situation)}`,
    `【Target】${display(item.task)}`,
  ].filter(Boolean).join('<br />');
}

function formatRequirementActionCell(item: RequirementItem): string {
  return [
    `【Action】${display(item.action)}`,
    `【Result】${display(item.result)}`,
  ].join('<br />');
}

function buildRequirementMarkdownTable(items: RequirementItem[]): string {
  const meaningfulItems = items.filter(hasRequirementContent);
  const rows = meaningfulItems.length > 0
    ? meaningfulItems.map((item) => [
      markdownCell(formatRequirementProblemCell(item)),
      markdownCell(formatRequirementActionCell(item)),
      markdownCell(item.highlights),
      markdownCell(item.shortcomings),
    ])
    : [['未填写具体材料', '未填写具体材料', '待补充', '待补充']];

  return [
    '| 主要解决了什么问题 | 如何去解决的，得到了什么结果 | 亮点 | 不足 |',
    '| :--- | :--- | :--- | :--- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildPlanMarkdownTable(items: PlanItem[]): string {
  const meaningfulItems = items.filter(hasPlanContent);
  const rows = meaningfulItems.length > 0
    ? meaningfulItems.map((item) => [
      markdownCell(item.problem),
      markdownCell(item.approach),
      markdownCell(item.effect),
    ])
    : [['待补充', '待补充', '待补充']];

  return [
    '| 重点要解决什么问题 | 具体解决思路 | 怎么判断效果如何 |',
    '| :--- | :--- | :--- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildSuggestionMarkdownTable(items: SuggestionItem[]): string {
  const meaningfulItems = items.filter(hasSuggestionContent);
  const rows = meaningfulItems.length > 0
    ? meaningfulItems.map((item) => [
      markdownCell(item.problem),
      markdownCell(item.suggestion),
      markdownCell(item.support),
    ])
    : [['待补充', '待补充', '待补充']];

  return [
    '| 团队现存问题 | 改进反馈建议 | 顾虑和支持 |',
    '| :--- | :--- | :--- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildPreviewMarkdown(form: ReviewFormState): string {
  const year = display(form.year);
  const summaryLabel = getSummaryKindLabel(form.summaryKind);
  return [
    `# ${year} ${summaryLabel}`,
    '',
    `## 一、${getWorkSummaryTitle(form)}`,
    '',
    '| 事项 | 结果 |',
    '| :--- | :--- |',
    `| 岗位 | ${markdownCell(form.roleSummary)} |`,
    `| 需求完成情况 | ${markdownCell(form.demandSummary)} |`,
    `| 过程质量 | ${markdownCell(form.processQuality)} |`,
    `| 线上质量 | ${markdownCell(form.onlineQuality)} |`,
    '',
    '### 业务需求',
    '',
    buildRequirementMarkdownTable(form.businessItems),
    '',
    '### 技术需求',
    '',
    buildRequirementMarkdownTable(form.technicalItems),
    '',
    `## 二、${getPlanSectionTitle(form)}`,
    '',
    buildPlanMarkdownTable(form.plans),
    '',
    '## 三、给团队的建议',
    '',
    buildSuggestionMarkdownTable(form.suggestions),
    '',
    '## 四、总结&反思',
    '',
    display(form.reflection),
  ].join('\n');
}

function desensitizeText(value: string): string {
  return value
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[链接已脱敏]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[邮箱已脱敏]')
    .replace(/\b[A-Za-z][A-Za-z0-9._-]{7,}\b/g, '[标识已脱敏]')
    .replace(/\d+(?:\.\d+)?%/g, 'XX%')
    .replace(/\d+(?:\.\d+)?/g, 'XX')
    .replace(/[A-Za-z]:\\[^\s，。；,;]+/g, '[路径已脱敏]')
    .replace(/(?:\/Users|\/var|\/tmp|\/home|\/opt|\/Volumes)\/[^\s，。；,;]+/g, '[路径已脱敏]');
}

function formatRequirementItems(title: string, items: RequirementItem[]): string {
  const meaningfulItems = items.filter(hasRequirementContent);
  if (meaningfulItems.length === 0) return `${title}：未填写`;

  return [
    `${title}：`,
    ...meaningfulItems.map((item, index) => [
      `${index + 1}. ${display(item.name)}${item.link.trim() ? `（${item.link.trim()}）` : ''}`,
      `   S 背景问题：${display(item.situation)}`,
      `   T 目标职责：${display(item.task)}`,
      `   A 关键行动：${display(item.action)}`,
      `   R 结果产出：${display(item.result)}`,
      `   亮点：${display(item.highlights)}`,
      `   不足/复盘：${display(item.shortcomings)}`,
    ].join('\n')),
  ].join('\n');
}

function formatPlanItems(title: string, items: PlanItem[]): string {
  const meaningfulItems = items.filter(hasPlanContent);
  if (meaningfulItems.length === 0) return `${title}：未填写`;

  return [
    `${title}：`,
    ...meaningfulItems.map((item, index) => [
      `${index + 1}. 重点问题：${display(item.problem)}`,
      `   解决思路：${display(item.approach)}`,
      `   效果判断：${display(item.effect)}`,
    ].join('\n')),
  ].join('\n');
}

function formatSuggestionItems(items: SuggestionItem[]): string {
  const meaningfulItems = items.filter(hasSuggestionContent);
  if (meaningfulItems.length === 0) return '给团队的建议：未填写';

  return [
    '给团队的建议：',
    ...meaningfulItems.map((item, index) => [
      `${index + 1}. 团队现存问题：${display(item.problem)}`,
      `   改进反馈建议：${display(item.suggestion)}`,
      `   顾虑和支持：${display(item.support)}`,
    ].join('\n')),
  ].join('\n');
}

function buildSourceMaterial(form: ReviewFormState): string {
  const planTitle = getPlanSectionTitle(form);
  return [
    `总结类型：${getSummaryKindLabel(form.summaryKind)}`,
    `总结年份：${display(form.year)}`,
    `规划周期：${getPlanPeriodLabel(form)}`,
    '',
    `${getWorkSummaryTitle(form)}：`,
    `- 岗位：${display(form.roleSummary)}`,
    `- 需求完成情况：${display(form.demandSummary)}`,
    `- 过程质量：${display(form.processQuality)}`,
    `- 线上质量：${display(form.onlineQuality)}`,
    '',
    formatRequirementItems('业务需求 STAR 材料', form.businessItems),
    '',
    formatRequirementItems('技术需求 STAR 材料', form.technicalItems),
    '',
    formatPlanItems(planTitle, form.plans),
    '',
    formatSuggestionItems(form.suggestions),
    '',
    `用户自填总结&反思：${display(form.reflection)}`,
  ].join('\n');
}

function buildReflectionPrompt(form: ReviewFormState): string {
  return [
    `请只生成${getSummaryKindLabel(form.summaryKind)}中的「总结&反思」正文，不要输出标题。`,
    '',
    '要求：',
    '- 必须根据已填写的岗位、业务需求、技术需求、不足和规划内容进行分析。',
    '- 需要体现成长、问题、改进方向和对团队的感谢，语气自然，不要空泛。',
    '- 如果用户已经写了草稿，可以保留个人表达并做结构化润色。',
    '- 300 到 500 字左右，不要编造精确数据。',
    '- 下方材料已经过脱敏处理，不要尝试还原链接、人员、路径、标识或精确数字。',
    '',
    '脱敏材料：',
    desensitizeText(buildSourceMaterial(form)),
  ].join('\n');
}

async function loadAiConfig(): Promise<ChatConfig> {
  if (!window.cinnaAPI?.getModels || !window.cinnaAPI?.storeGet) {
    throw new Error('当前运行环境缺少 AI 配置桥接，请在桌面应用中使用');
  }

  const [models, storedSettings] = await Promise.all([
    window.cinnaAPI.getModels(),
    window.cinnaAPI.storeGet('config'),
  ]);
  const settingsPatch = isRecord(storedSettings) ? storedSettings as Partial<ChatSettings> : {};
  const normalizedSettings = normalizeSettings(
    { ...defaultSettings, ...settingsPatch },
    models as ModelInfo[]
  );
  const config = getEffectiveChatConfig(normalizedSettings, models as ModelInfo[], []);

  if (!config.model.trim() || !config.baseUrl.trim() || !config.apiKey.trim()) {
    throw new Error('请先在 AI 聊天设置中配置模型、Base URL 和 API Key');
  }

  return {
    ...config,
    systemPrompt: REFLECTION_SYSTEM_PROMPT,
    temperature: 0.45,
    topP: 0.9,
    maxTokens: Math.max(config.maxTokens ?? 4096, 4096),
  };
}

const Field: React.FC<TextFieldProps> = ({
  label,
  value,
  placeholder = '',
  rows = 1,
  onChange,
}) => (
  <label className="docgen-field">
    <span className="docgen-field-label">{label}</span>
    {rows > 1 ? (
      <TextArea
        autoSize={{ minRows: rows, maxRows: Math.max(rows + 2, 6) }}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    ) : (
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )}
  </label>
);

const RequirementSection: React.FC<RequirementSectionProps> = ({
  title,
  items,
  onAdd,
  onRemove,
  onChange,
}) => (
  <section className="docgen-section">
    <div className="docgen-section-header">
      <div>
        <h2>{title}</h2>
        <div className="docgen-section-tags">
          <Tag>S 背景</Tag>
          <Tag>T 目标</Tag>
          <Tag>A 行动</Tag>
          <Tag>R 结果</Tag>
        </div>
      </div>
      <Button icon={<PlusOutlined />} onClick={onAdd}>
        添加需求
      </Button>
    </div>
    <div className="docgen-repeat-list">
      {items.map((item, index) => (
        <div className="docgen-repeat-item" key={item.id}>
          <div className="docgen-repeat-title">
            <strong>{item.name.trim() || `${title} ${index + 1}`}</strong>
            <Button
              aria-label="删除需求"
              disabled={items.length === 1}
              icon={<DeleteOutlined />}
              onClick={() => onRemove(item.id)}
            />
          </div>
          <div className="docgen-grid">
            <Field
              label="需求名称"
              value={item.name}
              placeholder="请输入需求名称"
              onChange={(value) => onChange(item.id, { name: value })}
            />
            <Field
              label="PRD 链接"
              value={item.link}
              placeholder="PRD 链接 / 项目链接 / 数据看板"
              onChange={(value) => onChange(item.id, { link: value })}
            />
          </div>
          <div className="docgen-grid">
            {REQUIREMENT_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={item[field.key]}
                placeholder={field.placeholder}
                rows={field.rows}
                onChange={(value) => onChange(item.id, { [field.key]: value } as Partial<RequirementItem>)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PlanSection: React.FC<PlanSectionProps> = ({
  title,
  items,
  onAdd,
  onRemove,
  onChange,
}) => (
  <section className="docgen-section">
    <div className="docgen-section-header">
      <h2>{title}</h2>
      <Button icon={<PlusOutlined />} onClick={onAdd}>
        添加规划
      </Button>
    </div>
    <div className="docgen-repeat-list">
      {items.map((item, index) => (
        <div className="docgen-repeat-item docgen-repeat-item--compact" key={item.id}>
          <div className="docgen-repeat-title">
            <strong>规划 {index + 1}</strong>
            <Button
              aria-label="删除规划"
              disabled={items.length === 1}
              icon={<DeleteOutlined />}
              onClick={() => onRemove(item.id)}
            />
          </div>
          <div className="docgen-grid">
            <Field
              label="重点要解决什么问题"
              value={item.problem}
              rows={3}
              onChange={(value) => onChange(item.id, { problem: value })}
            />
            <Field
              label="具体解决思路"
              value={item.approach}
              rows={3}
              onChange={(value) => onChange(item.id, { approach: value })}
            />
            <Field
              label="怎么判断效果如何"
              value={item.effect}
              rows={3}
              onChange={(value) => onChange(item.id, { effect: value })}
            />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const SuggestionSection: React.FC<SuggestionSectionProps> = ({
  items,
  onAdd,
  onRemove,
  onChange,
}) => (
  <section className="docgen-section">
    <div className="docgen-section-header">
      <h2>给团队的建议</h2>
      <Button icon={<PlusOutlined />} onClick={onAdd}>
        添加建议
      </Button>
    </div>
    <div className="docgen-repeat-list">
      {items.map((item, index) => (
        <div className="docgen-repeat-item docgen-repeat-item--compact" key={item.id}>
          <div className="docgen-repeat-title">
            <strong>建议 {index + 1}</strong>
            <Button
              aria-label="删除建议"
              disabled={items.length === 1}
              icon={<DeleteOutlined />}
              onClick={() => onRemove(item.id)}
            />
          </div>
          <div className="docgen-grid">
            <Field
              label="团队现存问题"
              value={item.problem}
              rows={3}
              onChange={(value) => onChange(item.id, { problem: value })}
            />
            <Field
              label="改进反馈建议"
              value={item.suggestion}
              rows={3}
              onChange={(value) => onChange(item.id, { suggestion: value })}
            />
            <Field
              label="顾虑和支持"
              value={item.support}
              rows={3}
              onChange={(value) => onChange(item.id, { support: value })}
            />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const DocumentGeneratorPage: React.FC<DocumentGeneratorPageProps> = ({ active }) => {
  const { message } = AntdApp.useApp();
  const [form, setForm] = useState<ReviewFormState>(() => createInitialForm());
  const [generationMode, setGenerationMode] = useState<GenerationMode>(null);
  const [generationError, setGenerationError] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const savedPathTimerRef = useRef<number | null>(null);

  const isGenerating = generationMode !== null;
  const summaryLabel = getSummaryKindLabel(form.summaryKind);
  const planSectionTitle = getPlanSectionTitle(form);
  const previewMarkdown = useMemo(() => buildPreviewMarkdown(form), [form]);
  const hasPreviewMarkdown = previewMarkdown.trim().length > 0;
  const previewTitle = useMemo(
    () => form.year.trim() ? `${form.year.trim()} ${summaryLabel}.md` : `${summaryLabel}.md`,
    [form.year, summaryLabel]
  );

  const updateForm = (patch: Partial<ReviewFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  useEffect(() => () => {
    if (savedPathTimerRef.current !== null) {
      window.clearTimeout(savedPathTimerRef.current);
    }
  }, []);

  const showSavedPath = (path: string) => {
    if (savedPathTimerRef.current !== null) {
      window.clearTimeout(savedPathTimerRef.current);
    }

    setSavedPath(path);
    savedPathTimerRef.current = window.setTimeout(() => {
      setSavedPath('');
      savedPathTimerRef.current = null;
    }, SAVED_PATH_VISIBLE_MS);
  };

  const updateRequirement = (
    listKey: RequirementListKey,
    id: string,
    patch: Partial<RequirementItem>
  ) => {
    setForm((current) => ({
      ...current,
      [listKey]: current[listKey].map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    }));
  };

  const removeRequirement = (listKey: RequirementListKey, id: string) => {
    setForm((current) => {
      const nextItems = current[listKey].filter((item) => item.id !== id);
      return {
        ...current,
        [listKey]: nextItems.length > 0 ? nextItems : [createRequirementItem()],
      };
    });
  };

  const updatePlan = (id: string, patch: Partial<PlanItem>) => {
    setForm((current) => ({
      ...current,
      plans: current.plans.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const updateSuggestion = (id: string, patch: Partial<SuggestionItem>) => {
    setForm((current) => ({
      ...current,
      suggestions: current.suggestions.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  };

  const runGeneration = async (
    prompt: string,
    onText: (text: string) => void
  ): Promise<string> => {
    const config = await loadAiConfig();
    let fullText = '';
    let error: Error | null = null;

    await streamChat(
      [{ role: 'user', content: prompt }],
      config,
      (chunk) => {
        fullText += chunk;
        onText(fullText);
      },
      (doneText) => {
        fullText = doneText.trim();
        onText(fullText);
      },
      (err) => {
        error = err;
      }
    );

    if (error) {
      throw error;
    }
    if (!fullText.trim()) {
      throw new Error('AI 没有返回内容');
    }

    return fullText.trim();
  };

  const handleGenerateReflection = async () => {
    if (!hasFormContent(form)) {
      message.warning('先填写一些总结材料，再生成总结&反思');
      return;
    }

    setGenerationMode('reflection');
    setGenerationError('');

    try {
      const output = await runGeneration(buildReflectionPrompt(form), (text) => {
        updateForm({ reflection: text });
      });
      updateForm({ reflection: output });
      message.success('总结&反思已生成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setGenerationError(errorMessage);
      message.error(errorMessage);
    } finally {
      setGenerationMode(null);
    }
  };

  const handleStopGeneration = () => {
    stopGeneration();
    setGenerationMode(null);
    message.info('已停止生成');
  };

  const handleCopy = async () => {
    if (!hasPreviewMarkdown) return;

    try {
      if (window.cinnaAPI?.writeClipboardText) {
        await window.cinnaAPI.writeClipboardText(previewMarkdown);
      } else {
        await navigator.clipboard.writeText(previewMarkdown);
      }
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const handleDownload = async () => {
    if (!hasPreviewMarkdown) return;

    try {
      if (!window.cinnaAPI?.saveGeneratedDocument) {
        throw new Error('请在桌面应用中下载文档');
      }
      const result = await window.cinnaAPI.saveGeneratedDocument({
        content: previewMarkdown,
        fileName: `${summaryLabel}-${form.year.trim() || '未命名'}`,
        extension: 'md',
      });
      showSavedPath(result.path);
      message.success(`已保存：${result.fileName}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className={`document-generator-page${active ? ' is-active' : ''}`}>
      <header className="docgen-header">
        <div>
          <div className="docgen-title-line">
            <FileTextOutlined />
            <h1>总结生成</h1>
          </div>
          <p>按 STAR 拆解需求，生成参考述职结构的 Markdown 文档。</p>
        </div>
        {isGenerating && (
          <div className="docgen-header-actions">
            <Button icon={<StopOutlined />} onClick={handleStopGeneration}>
              停止
            </Button>
          </div>
        )}
      </header>

      <div className="docgen-body">
        <div className="docgen-editor">
          <section className="docgen-section">
            <div className="docgen-section-header">
              <h2>工作总结</h2>
            </div>
            <div className="docgen-grid">
              <div className="docgen-field">
                <span className="docgen-field-label">总结类型</span>
                <Radio.Group
                  className="docgen-summary-kind"
                  options={SUMMARY_KIND_OPTIONS}
                  value={form.summaryKind}
                  onChange={(event) => updateForm({ summaryKind: event.target.value as SummaryKind })}
                />
              </div>
              <Field
                label="年份"
                value={form.year}
                placeholder="2026"
                onChange={(value) => updateForm({ year: value })}
              />
              <Field
                label="需求完成情况"
                value={form.demandSummary}
                placeholder="共完成 XX 个需求，需求列表：urlxxx"
                onChange={(value) => updateForm({ demandSummary: value })}
              />
            </div>
            <div className="docgen-grid">
              <Field
                label="岗位"
                value={form.roleSummary}
                rows={3}
                placeholder="时间、岗位、主要职责、协作范围"
                onChange={(value) => updateForm({ roleSummary: value })}
              />
              <Field
                label="过程质量"
                value={form.processQuality}
                rows={3}
                placeholder="代码变更量、缺陷数量、千行 bug 率、CR/自测情况"
                onChange={(value) => updateForm({ processQuality: value })}
              />
              <Field
                label="线上质量"
                value={form.onlineQuality}
                rows={3}
                placeholder="线上问题数量、影响范围、稳定性结论"
                onChange={(value) => updateForm({ onlineQuality: value })}
              />
            </div>
          </section>

          <RequirementSection
            title="业务需求"
            items={form.businessItems}
            onAdd={() => updateForm({ businessItems: [...form.businessItems, createRequirementItem()] })}
            onRemove={(id) => removeRequirement('businessItems', id)}
            onChange={(id, patch) => updateRequirement('businessItems', id, patch)}
          />

          <RequirementSection
            title="技术需求"
            items={form.technicalItems}
            onAdd={() => updateForm({ technicalItems: [...form.technicalItems, createRequirementItem()] })}
            onRemove={(id) => removeRequirement('technicalItems', id)}
            onChange={(id, patch) => updateRequirement('technicalItems', id, patch)}
          />

          <PlanSection
            title={planSectionTitle}
            items={form.plans}
            onAdd={() => updateForm({ plans: [...form.plans, createPlanItem()] })}
            onRemove={(id) => updateForm({
              plans: form.plans.filter((item) => item.id !== id).length > 0
                ? form.plans.filter((item) => item.id !== id)
                : [createPlanItem()],
            })}
            onChange={updatePlan}
          />

          <SuggestionSection
            items={form.suggestions}
            onAdd={() => updateForm({ suggestions: [...form.suggestions, createSuggestionItem()] })}
            onRemove={(id) => updateForm({
              suggestions: form.suggestions.filter((item) => item.id !== id).length > 0
                ? form.suggestions.filter((item) => item.id !== id)
                : [createSuggestionItem()],
            })}
            onChange={updateSuggestion}
          />

          <section className="docgen-section">
            <div className="docgen-section-header">
              <h2>总结&反思</h2>
              <Button
                icon={<ThunderboltOutlined />}
                loading={generationMode === 'reflection'}
                disabled={isGenerating && generationMode !== 'reflection'}
                onClick={handleGenerateReflection}
              >
                脱敏 AI 生成
              </Button>
            </div>
            <div className="docgen-grid">
              <Field
                label="个人总结"
                value={form.reflection}
                rows={6}
                placeholder="这里可以自己发挥；也可以基于前面填写内容生成"
                onChange={(value) => updateForm({ reflection: value })}
              />
            </div>
          </section>
        </div>

        <aside className="docgen-preview">
          <div className="docgen-preview-header">
            <div>
              <span className="docgen-preview-kicker">实时预览</span>
              <strong>{previewTitle}</strong>
            </div>
            <div className="docgen-preview-actions">
              <Button icon={<CopyOutlined />} disabled={!hasPreviewMarkdown} onClick={handleCopy}>
                复制
              </Button>
              <Button icon={<DownloadOutlined />} disabled={!hasPreviewMarkdown} onClick={handleDownload}>
                下载
              </Button>
            </div>
          </div>

          {generationError && (
            <Alert
              className="docgen-alert"
              type="error"
              title={generationError}
              showIcon
            />
          )}
          {savedPath && (
            <Alert
              className="docgen-alert"
              type="success"
              title="已保存到默认下载目录"
              description={savedPath}
              showIcon
            />
          )}

          <div className="docgen-preview-content">
            <div className="docgen-markdown-render">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  td: ({ children, ...props }) => (
                    <td {...props}>{renderMarkdownLineBreaks(children)}</td>
                  ),
                }}
              >
                {previewMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default DocumentGeneratorPage;
