import { streamChat, type ChatConfig } from '@/shared/services/aiService';
import type {
  AiBottleneck,
  AiLogAnalysis,
  AiNetworkIssue,
  BottleneckPriority,
  LocalLogAnalysis,
} from '../types';
import { formatDuration, formatLogTime, redactSensitiveText, sanitizeLogText } from './parser';

type AiStep = 'cold-start' | 'network';

interface ColdStartAiPayload {
  coldStartSummary?: unknown;
  bottlenecks?: unknown;
}

interface NetworkAiPayload {
  networkSummary?: unknown;
  networkIssues?: unknown;
}

const JSON_OUTPUT_RULES = [
  '只输出 JSON，不要输出 markdown 代码块。',
  '所有结论必须基于输入摘要；证据不足时明确写“证据不足”。',
  '不要还原、猜测或输出被脱敏的账号、门店、设备、邮箱、IP、token。',
  '瓶颈优先级只允许 P0、P1、P2，其中 P0 表示阻塞或直接导致冷启失败/极慢，P1 表示明显拖慢关键路径，P2 表示可优化但影响较小。',
].join('\n');

function compactAiText(text: string, length = 260): string {
  const sanitized = sanitizeLogText(text);
  return sanitized.length > length ? `${sanitized.slice(0, length)}...` : sanitized;
}

function buildSnapshot(report: LocalLogAnalysis) {
  return {
    file: {
      name: report.fileName,
      size: report.fileSize,
      lines: report.lineCount,
    },
    deviceInfo: report.deviceInfo,
    launches: report.launches.slice(0, 6).map((launch) => ({
      title: launch.title,
      startTime: formatLogTime(launch.startMs),
      duration: formatDuration(launch.durationMs),
      stages: launch.stages.slice(0, 18).map((stage) => ({
        name: stage.name,
        startTime: formatLogTime(stage.startMs),
        duration: formatDuration(stage.durationMs),
        operationType: stage.operationType,
        evidence: stage.evidence,
      })),
    })),
    stageRanking: report.stageRanking.slice(0, 25).map((stage) => ({
      name: stage.name,
      operationType: stage.operationType,
      count: stage.count,
      maxDuration: formatDuration(stage.maxMs),
      averageDuration: formatDuration(stage.averageMs),
      evidence: stage.evidence,
    })),
    network: {
      stats: report.network.stats,
      descriptions: report.network.descriptions,
      layerSummary: report.network.layerSummary,
      failureReasons: report.network.failureReasons.slice(0, 12),
      startupResults: report.network.startupResults.slice(0, 10).map((item) => ({
        index: item.index,
        startTime: formatLogTime(item.startMs),
        context: item.context,
        result: item.result,
        duration: formatDuration(item.durationMs),
        failureCode: item.failureCode,
        detail: item.detail,
      })),
      events: report.network.events.slice(0, 50).map((event) => ({
        time: formatLogTime(event.timeMs),
        level: event.level,
        category: event.category,
        description: compactAiText(event.description),
      })),
      endpoints: report.network.endpoints.slice(0, 15),
    },
  };
}

function stringifySnapshot(report: LocalLogAnalysis): string {
  return JSON.stringify(buildSnapshot(report), null, 2);
}

function buildColdStartPrompt(report: LocalLogAnalysis): string {
  return [
    '你是桌面端应用冷启性能分析助手。请分析下面经过脱敏和裁剪的日志摘要。',
    JSON_OUTPUT_RULES,
    '输出 JSON 结构：',
    '{"coldStartSummary":"一句话总结冷启健康度","bottlenecks":[{"priority":"P0|P1|P2","title":"问题标题","stageName":"相关阶段","impact":"影响说明","evidence":"日志证据","suggestion":"优化建议"}]}',
    '要求：bottlenecks 按 P0、P1、P2 排序，同优先级内按影响耗时从大到小排序；重点识别关键路径、同步阻塞、网络/DNS 导致的冷启延迟、可并行化阶段。',
    '日志摘要：',
    stringifySnapshot(report),
  ].join('\n\n');
}

function buildNetworkPrompt(report: LocalLogAnalysis): string {
  return [
    '你是桌面端应用网络状态分析助手。请分析下面经过脱敏和裁剪的日志摘要。',
    JSON_OUTPUT_RULES,
    '输出 JSON 结构：',
    '{"networkSummary":"网络状态总体判断","networkIssues":[{"priority":"P0|P1|P2","title":"问题标题","evidence":"日志证据","suggestion":"处理或优化建议"}]}',
    '要求：关注 DNS/HttpDNS、代理、弱网/高延迟、网络错误页、接口错误、上报失败、启动期网络恢复对冷启的影响。',
    '日志摘要：',
    stringifySnapshot(report),
  ].join('\n\n');
}

function extractJsonPayload(text: string): unknown | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizePriority(value: unknown): BottleneckPriority {
  return value === 'P0' || value === 'P1' || value === 'P2' ? value : 'P2';
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? redactSensitiveText(value.trim()) : fallback;
}

function normalizeBottlenecks(value: unknown): AiBottleneck[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): AiBottleneck | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title);
      const suggestion = normalizeText(record.suggestion);
      if (!title || !suggestion) return null;
      return {
        priority: normalizePriority(record.priority),
        title,
        stageName: normalizeText(record.stageName) || undefined,
        impact: normalizeText(record.impact) || undefined,
        evidence: normalizeText(record.evidence) || undefined,
        suggestion,
      };
    })
    .filter((item): item is AiBottleneck => Boolean(item))
    .sort((a, b) => a.priority.localeCompare(b.priority));
}

function normalizeNetworkIssues(value: unknown): AiNetworkIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): AiNetworkIssue | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title);
      const suggestion = normalizeText(record.suggestion);
      if (!title || !suggestion) return null;
      return {
        priority: normalizePriority(record.priority),
        title,
        evidence: normalizeText(record.evidence) || undefined,
        suggestion,
      };
    })
    .filter((item): item is AiNetworkIssue => Boolean(item))
    .sort((a, b) => a.priority.localeCompare(b.priority));
}

function mergeAiPayload(step: AiStep, text: string, current: AiLogAnalysis): AiLogAnalysis {
  const parsed = extractJsonPayload(text);
  if (!parsed || typeof parsed !== 'object') {
    return {
      ...current,
      rawText: [current.rawText, text].filter(Boolean).join('\n\n'),
    };
  }

  if (step === 'cold-start') {
    const payload = parsed as ColdStartAiPayload;
    return {
      ...current,
      coldStartSummary: normalizeText(payload.coldStartSummary) || current.coldStartSummary,
      bottlenecks: normalizeBottlenecks(payload.bottlenecks),
    };
  }

  const payload = parsed as NetworkAiPayload;
  return {
    ...current,
    networkSummary: normalizeText(payload.networkSummary) || current.networkSummary,
    networkIssues: normalizeNetworkIssues(payload.networkIssues),
  };
}

async function requestAiText(prompt: string, config: ChatConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    let streamedText = '';
    const tunedConfig: ChatConfig = {
      ...config,
      temperature: Math.min(config.temperature ?? 0.2, 0.3),
      systemPrompt: '你是专业的桌面端日志分析助手。必须严格按用户要求输出可解析 JSON。',
    };

    streamChat(
      [{ role: 'user', content: prompt }],
      tunedConfig,
      (chunk) => {
        streamedText += chunk;
      },
      (fullText) => {
        resolve(fullText || streamedText);
      },
      (error) => {
        reject(error);
      }
    ).catch(reject);
  });
}

export async function runAiLogAnalysis(
  report: LocalLogAnalysis,
  config: ChatConfig,
  onStep?: (step: AiStep) => void
): Promise<AiLogAnalysis> {
  let result: AiLogAnalysis = {
    bottlenecks: [],
    networkIssues: [],
  };

  onStep?.('cold-start');
  const coldStartText = await requestAiText(buildColdStartPrompt(report), config);
  result = mergeAiPayload('cold-start', coldStartText, result);

  onStep?.('network');
  const networkText = await requestAiText(buildNetworkPrompt(report), config);
  result = mergeAiPayload('network', networkText, result);

  return result;
}
