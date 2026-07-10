import type {
  ColdStartLaunch,
  ColdStartStage,
  DeviceInfoItem,
  LocalLogAnalysis,
  LocalNetworkAnalysis,
  NetworkEndpointStat,
  NetworkEvent,
  NetworkFailureLayer,
  NetworkFailureReasonStat,
  OperationType,
  ParseProgress,
  StartupNetworkResult,
  StageRankingItem,
} from '../types';

const STARTUP_WINDOW_MS = 120_000;
const MAX_NETWORK_EVENTS = 80;
const MAX_ENDPOINTS = 20;
const PROGRESS_INTERVAL_MS = 90;

interface ParsedLogLine {
  timeMs: number | null;
  normalizedTimeMs: number | null;
  level: NetworkEvent['level'];
  text: string;
}

interface OpenStage {
  key: string;
  name: string;
  startMs: number;
  operationType: OperationType;
  evidence: string;
}

interface LaunchBuilder {
  id: string;
  startMs: number;
  endMs: number;
  eventCount: number;
  stages: ColdStartStage[];
  openStages: Map<string, OpenStage>;
}

interface DeviceState {
  appVersion?: string;
  buildOS?: string;
  electronVer?: string;
  osVersion?: string;
  profile?: Record<string, unknown>;
  latestSystemInfo?: Record<string, unknown>;
  networkStrengths: number[];
}

interface NetworkState {
  events: NetworkEvent[];
  endpointMap: Map<string, NetworkEndpointStat>;
  failureReasonMap: Map<string, Omit<NetworkFailureReasonStat, 'ratio'>>;
  failureOccurrences: Array<{
    code: string;
    description: string;
    layer: NetworkFailureLayer;
    timeMs: number | null;
  }>;
  latencySamples: number[];
  networkTypes: Map<string, number>;
  errorCount: number;
  timeoutCount: number;
  dnsErrorCount: number;
  offlineCount: number;
}

interface ParserState {
  currentLaunch: LaunchBuilder | null;
  launches: ColdStartLaunch[];
  device: DeviceState;
  network: NetworkState;
  lastRawTimeMs: number | null;
  dayOffsetMs: number;
  previousParsedLine: ParsedLogLine | null;
}

function createParserState(): ParserState {
  return {
    currentLaunch: null,
    launches: [],
    device: {
      networkStrengths: [],
    },
    network: {
      events: [],
      endpointMap: new Map(),
      failureReasonMap: new Map(),
      failureOccurrences: [],
      latencySamples: [],
      networkTypes: new Map(),
      errorCount: 0,
      timeoutCount: 0,
      dnsErrorCount: 0,
      offlineCount: 0,
    },
    lastRawTimeMs: null,
    dayOffsetMs: 0,
    previousParsedLine: null,
  };
}

export function isLogFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.log');
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${seconds} s`;
}

export function formatLogTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '-';
  const total = Math.max(0, Math.round(ms));
  const day = Math.floor(total / 86_400_000);
  const timeInDay = total % 86_400_000;
  const hours = Math.floor(timeInDay / 3_600_000);
  const minutes = Math.floor((timeInDay % 3_600_000) / 60_000);
  const seconds = Math.floor((timeInDay % 60_000) / 1000);
  const millis = timeInDay % 1000;
  const value = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis
    .toString()
    .padStart(3, '0')}`;
  return day > 0 ? `+${day}d ${value}` : value;
}

export function redactSensitiveText(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<ip>')
    .replace(/(["']?)(token|authorization|password|passwd|secret|apiKey|api_key)\1\s*[:=]\s*["']?[^"',}\s]+/gi, '$1$2$1:"<redacted>"')
    .replace(/(["']?)(accountId|acctId|shopId|userId|deviceUuid|deviceSn|mTraceid|traceId|phone|mobile)\1\s*[:=]\s*["']?[^"',}\s]+/gi, '$1$2$1:"<redacted>"')
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, '<hash>')
    .replace(/\b\d{8,}\b/g, (value) => `${value.slice(0, 2)}***${value.slice(-2)}`)
    .replace(/([?&](?:token|uuid|userId|shopId|accountId|acctId|deviceId|mTraceid|traceId)=)[^&\s]+/gi, '$1<redacted>');
}

export function sanitizeLogText(input: string): string {
  return redactSensitiveText(input.replace(/\s+/g, ' ').trim());
}

function parseTimestamp(line: string, state: ParserState): { raw: number; normalized: number } | null {
  const match = line.match(/^\[(?:\d{4}-\d{2}-\d{2}\s+)?(\d{2}):(\d{2}):(\d{2})\.(\d{3})]/);
  if (!match) return null;

  const [, hour, minute, second, millisecond] = match;
  const raw =
    Number(hour) * 3_600_000 +
    Number(minute) * 60_000 +
    Number(second) * 1000 +
    Number(millisecond);

  if (state.lastRawTimeMs !== null && raw + 3_600_000 < state.lastRawTimeMs) {
    state.dayOffsetMs += 86_400_000;
  }
  state.lastRawTimeMs = raw;

  return {
    raw,
    normalized: raw + state.dayOffsetMs,
  };
}

function parseLine(line: string, state: ParserState): ParsedLogLine {
  const timestamp = parseTimestamp(line, state);
  const levelMatch = line.match(/\]\s+\[(info|warn|error)]/i);
  const level = (levelMatch?.[1]?.toLowerCase() ?? 'unknown') as ParsedLogLine['level'];
  return {
    timeMs: timestamp?.raw ?? null,
    normalizedTimeMs: timestamp?.normalized ?? null,
    level,
    text: line,
  };
}

function clip(text: string, length = 220): string {
  const sanitized = sanitizeLogText(text);
  return sanitized.length > length ? `${sanitized.slice(0, length)}...` : sanitized;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonObject(line: string): Record<string, unknown> | null {
  const start = line.indexOf('{');
  if (start === -1) return null;
  const payload = safeJsonParse(line.slice(start));
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
}

function parseNestedJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return null;
  const parsed = safeJsonParse(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function extractDurationMs(line: string): number | null {
  const match =
    line.match(/(?:耗时|总耗时|duration|cost|elapsed|took)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(ms|毫秒|s|秒)?/i) ||
    line.match(/\bafter\s+(\d+(?:\.\d+)?)\s*(ms|s)\b/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2]?.toLowerCase();
  return unit === 's' || unit === '秒' ? value * 1000 : value;
}

function inferOperationType(text: string): OperationType {
  if (/异步|async|RemoteConfig|HttpDNS|网络|network|fetch|request|ReportManager|c-lodop|clodop|LaunchSelfCheck|DeviceProfile|Proxy/i.test(text)) {
    return 'async';
  }
  if (/同步|sync/i.test(text)) return 'sync';
  return 'sync';
}

function isColdStartRelevant(text: string): boolean {
  return /App Start|LifeCycle App Ready|DOM|页面完全加载|导航完成|启动|初始化|App Ready|Main-window|Main-Window|主窗口|Loading窗口|RemoteConfig|HttpDNS|Resource interceptor|资源|Printer|clodop|c-lodop|ProcessGuard 守护|DeviceProfile|LaunchSelfCheck|app_open_time|webID|WebID|setProxy|Proxy|离线资源/i.test(text);
}

function getExplicitStageName(text: string): string {
  if (/DOM 开始加载完成/i.test(text)) return 'Web DOM 加载';
  if (/页面完全加载完成/i.test(text)) return 'Web 页面完全加载';
  if (/导航完成/i.test(text)) return text.includes('network-error') ? '网络错误页导航' : '主页面导航完成';
  if (/Target Socket Error/i.test(text)) return '代理网络探测';
  if (/LaunchSelfCheck/i.test(text)) return '启动自检';
  return clip(text, 56);
}

function startLaunch(state: ParserState, timeMs: number, evidence: string): LaunchBuilder {
  if (state.currentLaunch) {
    finalizeCurrentLaunch(state);
  }

  const launch: LaunchBuilder = {
    id: `launch-${state.launches.length + 1}`,
    startMs: timeMs,
    endMs: timeMs,
    eventCount: 1,
    stages: [],
    openStages: new Map(),
  };
  state.currentLaunch = launch;
  addStage(launch, {
    id: `${launch.id}-stage-${launch.stages.length + 1}`,
    name: 'App Start',
    startMs: timeMs,
    endMs: timeMs + 40,
    durationMs: 40,
    operationType: 'sync',
    evidence,
  });
  return launch;
}

function shouldAttachToLaunch(state: ParserState, timeMs: number): state is ParserState & { currentLaunch: LaunchBuilder } {
  return Boolean(
    state.currentLaunch &&
    timeMs >= state.currentLaunch.startMs &&
    timeMs - state.currentLaunch.startMs <= STARTUP_WINDOW_MS
  );
}

function addStage(launch: LaunchBuilder, stage: ColdStartStage): void {
  if (!Number.isFinite(stage.durationMs) || stage.durationMs < 0) return;

  const durationMs = Math.max(1, Math.round(stage.durationMs));
  const startMs = Math.round(stage.startMs);
  const endMs = Math.max(startMs + durationMs, Math.round(stage.endMs));
  const key = `${stage.name}:${startMs}:${durationMs}`;
  const exists = launch.stages.some((item) => `${item.name}:${item.startMs}:${item.durationMs}` === key);
  if (exists) return;

  launch.stages.push({
    ...stage,
    startMs,
    endMs,
    durationMs,
  });
  launch.endMs = Math.max(launch.endMs, endMs);
}

function startOpenStage(
  launch: LaunchBuilder,
  key: string,
  name: string,
  timeMs: number,
  operationType: OperationType,
  evidence: string
): void {
  if (launch.openStages.has(key)) return;
  launch.openStages.set(key, {
    key,
    name,
    startMs: timeMs,
    operationType,
    evidence,
  });
}

function finishOpenStage(
  launch: LaunchBuilder,
  key: string,
  endMs: number,
  fallbackName: string,
  evidence: string
): void {
  const open = launch.openStages.get(key);
  if (!open) {
    addStage(launch, {
      id: `${launch.id}-stage-${launch.stages.length + 1}`,
      name: fallbackName,
      startMs: Math.max(launch.startMs, endMs - 80),
      endMs,
      durationMs: 80,
      operationType: inferOperationType(evidence),
      evidence: clip(evidence),
    });
    return;
  }

  launch.openStages.delete(key);
  addStage(launch, {
    id: `${launch.id}-stage-${launch.stages.length + 1}`,
    name: open.name,
    startMs: open.startMs,
    endMs,
    durationMs: endMs - open.startMs,
    operationType: open.operationType,
    evidence: `${open.evidence} -> ${clip(evidence)}`,
  });
}

function applyLaunchRules(state: ParserState, line: ParsedLogLine): void {
  const timeMs = line.normalizedTimeMs;
  if (timeMs === null) return;

  if (/App Start|冷启动开始|cold start/i.test(line.text)) {
    startLaunch(state, timeMs, clip(line.text));
  }

  if (!shouldAttachToLaunch(state, timeMs)) return;

  const launch = state.currentLaunch;
  launch.endMs = Math.max(launch.endMs, timeMs);
  launch.eventCount += 1;

  const text = line.text;
  const evidence = clip(text);

  if (/WebID.*获取成功|\[webID]获取成功/i.test(text)) {
    addStage(launch, {
      id: `${launch.id}-stage-${launch.stages.length + 1}`,
      name: 'WebID 获取',
      startMs: launch.startMs,
      endMs: timeMs,
      durationMs: timeMs - launch.startMs,
      operationType: 'sync',
      evidence,
    });
  }

  if (/Printer 开始启动clodop|开始第\d+次启动c-lodop尝试/i.test(text)) {
    startOpenStage(launch, 'clodop', 'C-Lodop 启动', timeMs, 'async', evidence);
  }
  if (/c-lodop.*启动成功|启动c-lodop成功/i.test(text)) {
    finishOpenStage(launch, 'clodop', timeMs, 'C-Lodop 启动', evidence);
  }

  if (/\[RemoteConfig].*开始拉取远程配置/i.test(text)) {
    startOpenStage(launch, 'remote-config', '远程配置拉取', timeMs, 'async', evidence);
  }
  if (/\[RemoteConfig].*(配置.*成功|均拉取失败|拉取失败，使用默认)|horn config 已返回/i.test(text)) {
    finishOpenStage(launch, 'remote-config', timeMs, '远程配置拉取', evidence);
  }

  if (/\[HttpDNS].*初始化 HttpDNS|HttpDNS \[Initialize]/i.test(text)) {
    if (/初始化成功|初始化完成/i.test(text)) {
      finishOpenStage(launch, 'httpdns', timeMs, 'HttpDNS 初始化', evidence);
    } else {
      startOpenStage(launch, 'httpdns', 'HttpDNS 初始化', timeMs, 'async', evidence);
    }
  }

  if (/本地资源目录|注册自定义协议/i.test(text)) {
    startOpenStage(launch, 'resource-interceptor', '本地资源拦截器', timeMs, 'sync', evidence);
  }
  if (/Resource interceptor setup completed/i.test(text)) {
    finishOpenStage(launch, 'resource-interceptor', timeMs, '本地资源拦截器', evidence);
  }

  if (/开始创建Loading窗口/i.test(text)) {
    startOpenStage(launch, 'loading-window', 'Loading 窗口创建', timeMs, 'sync', evidence);
  }
  if (/正常显示Loading窗口|Loading窗口已显示/i.test(text)) {
    finishOpenStage(launch, 'loading-window', timeMs, 'Loading 窗口创建', evidence);
  }

  if (/开始创建主窗口/i.test(text)) {
    startOpenStage(launch, 'main-window', '主窗口创建', timeMs, 'sync', evidence);
  }
  if (/主窗口创建完成/i.test(text)) {
    finishOpenStage(launch, 'main-window', timeMs, '主窗口创建', evidence);
    startOpenStage(launch, 'main-page-load', '主页面加载', timeMs, 'async', evidence);
  }
  if (/LifeCycle App Ready|Main-window 加载主页面失败|Main-Window is-main-window-ready/i.test(text)) {
    finishOpenStage(launch, 'main-page-load', timeMs, '主页面加载', evidence);
  }

  if (/非守护进程启动/i.test(text)) {
    startOpenStage(launch, 'process-guard', '守护进程启动', timeMs, 'async', evidence);
  }
  if (/ProcessGuard 守护进程已启动/i.test(text)) {
    finishOpenStage(launch, 'process-guard', timeMs, '守护进程启动', evidence);
  }

  if (/LaunchSelfCheck 文件 hash 计算成功/i.test(text)) {
    startOpenStage(launch, 'self-check', '启动完整性自检', timeMs, 'async', evidence);
  }
  if (/LaunchSelfCheck 签名有效|LaunchSelfCheck \[/i.test(text)) {
    finishOpenStage(launch, 'self-check', timeMs, '启动完整性自检', evidence);
  }

  const durationMs = extractDurationMs(text);
  if (durationMs !== null && isColdStartRelevant(text)) {
    addStage(launch, {
      id: `${launch.id}-stage-${launch.stages.length + 1}`,
      name: getExplicitStageName(text),
      startMs: Math.max(launch.startMs, timeMs - durationMs),
      endMs: timeMs,
      durationMs,
      operationType: inferOperationType(text),
      evidence,
    });
  }
}

function finalizeCurrentLaunch(state: ParserState): void {
  const launch = state.currentLaunch;
  if (!launch) return;

  for (const open of launch.openStages.values()) {
    const endMs = Math.min(Math.max(launch.endMs, open.startMs + 80), open.startMs + 30_000);
    addStage(launch, {
      id: `${launch.id}-stage-${launch.stages.length + 1}`,
      name: open.name,
      startMs: open.startMs,
      endMs,
      durationMs: endMs - open.startMs,
      operationType: open.operationType,
      evidence: open.evidence,
    });
  }
  launch.openStages.clear();

  const stages = launch.stages
    .filter((stage) => stage.durationMs > 0)
    .sort((a, b) => a.startMs - b.startMs);
  const endMs = stages.reduce((max, stage) => Math.max(max, stage.endMs), launch.endMs);

  state.launches.push({
    id: launch.id,
    title: `启动 ${state.launches.length + 1}`,
    startMs: launch.startMs,
    endMs,
    durationMs: Math.max(1, endMs - launch.startMs),
    stages,
    eventCount: launch.eventCount,
  });
  state.currentLaunch = null;
}

interface FailureReasonSeed {
  code: string;
  label: string;
  layer: NetworkFailureLayer;
  scenario: string;
}

const NETWORK_ERROR_SCENARIOS: Record<string, string> = {
  ERR_ABORTED: '请求被中止，常见于弱网首屏资源加载降级或页面切换中断',
  ERR_NETWORK_CHANGED: '加载过程中网络切换或连接状态变化',
  ERR_EMPTY_RESPONSE: '服务端无响应或连接被提前关闭',
  ERR_CONNECTION_RESET: '连接被重置，可能与代理、链路或服务端连接有关',
  ERR_CONNECTION_REFUSED: '连接被拒绝，目标服务不可达',
  ERR_NAME_NOT_RESOLVED: '域名解析失败，需关注 DNS/HttpDNS',
  ERR_TIMED_OUT: '请求超时，需关注弱网和接口耗时',
};

function addFailureReason(
  state: ParserState,
  line: ParsedLogLine,
  reason: FailureReasonSeed,
  example = line.text
): void {
  const current = state.network.failureReasonMap.get(reason.code) ?? {
    ...reason,
    count: 0,
    example: clip(example, 160),
  };

  current.count += 1;
  if (!current.example) current.example = clip(example, 160);
  state.network.failureReasonMap.set(reason.code, current);
  state.network.failureOccurrences.push({
    code: reason.code,
    description: clip(example, 160),
    layer: reason.layer,
    timeMs: line.normalizedTimeMs,
  });
}

function getHttpScenario(statusCode: number): string {
  if (statusCode === 401 || statusCode === 403) return '鉴权/授权失败，通常属于业务层拦截';
  if (statusCode === 404) return '接口或资源不存在，需检查路由和版本匹配';
  if (statusCode === 408 || statusCode === 504) return '网关或服务请求超时';
  if (statusCode === 429) return '请求被限流';
  if (statusCode >= 500) return '服务端异常或网关错误';
  return '接口返回业务错误状态';
}

function buildHttpFailureReason(status: unknown, responseCode?: string | null): FailureReasonSeed | null {
  const statusCode = toNumber(status);
  if (statusCode !== null && statusCode >= 400) {
    return {
      code: `HTTP ${statusCode}`,
      label: statusCode === 401 || statusCode === 403
        ? `HTTP ${statusCode}（鉴权）`
        : `HTTP ${statusCode}`,
      layer: 'business',
      scenario: getHttpScenario(statusCode),
    };
  }

  if (responseCode && !/^(0|200|success|ok)$/i.test(responseCode)) {
    return {
      code: `BUSINESS ${responseCode}`,
      label: `业务码 ${responseCode}`,
      layer: 'business',
      scenario: '接口 HTTP 成功但业务码异常',
    };
  }

  return null;
}

function extractFailureReasonFromText(text: string): FailureReasonSeed | null {
  const errMatch = text.match(/\b(ERR_[A-Z_]+)(?:\s*\((-?\d+)\))?/i);
  if (errMatch) {
    const rawCode = errMatch[1].toUpperCase();
    return {
      code: errMatch[2] ? `${rawCode} (${errMatch[2]})` : rawCode,
      label: errMatch[2] ? `${rawCode} (${errMatch[2]})` : rawCode,
      layer: 'network',
      scenario: NETWORK_ERROR_SCENARIOS[rawCode] ?? 'Chromium/网络层错误',
    };
  }

  const httpMatch = text.match(/\bHTTP\s+([45]\d{2})\b/i);
  if (httpMatch) {
    return buildHttpFailureReason(httpMatch[1]);
  }

  if (/ENOTFOUND|getaddrinfo/i.test(text)) {
    return {
      code: 'DNS ENOTFOUND',
      label: 'DNS ENOTFOUND',
      layer: 'network',
      scenario: '域名解析失败，需关注 DNS/HttpDNS 或本地 DNS 环境',
    };
  }

  if (/timeout|超时|AbortError/i.test(text)) {
    return {
      code: 'TIMEOUT',
      label: 'TIMEOUT',
      layer: 'network',
      scenario: '请求或资源加载超时',
    };
  }

  if (/offline|network-error|网络错误|加载失败/i.test(text)) {
    return {
      code: 'NETWORK_ERROR_PAGE',
      label: '网络错误页',
      layer: 'network',
      scenario: '首屏或资源加载进入网络错误页',
    };
  }

  return null;
}

function addNetworkEvent(
  state: ParserState,
  line: ParsedLogLine,
  category: string,
  description = line.text
): void {
  const failureReason = extractFailureReasonFromText(line.text);
  if (failureReason) addFailureReason(state, line, failureReason, description);

  if (line.level === 'error' || /\berror\b|失败|failed|ERR_|ENOTFOUND|ECONNRESET|timeout|超时/i.test(line.text)) {
    state.network.errorCount += 1;
  }
  if (/timeout|超时|AbortError/i.test(line.text)) state.network.timeoutCount += 1;
  if (/dns|ENOTFOUND|getaddrinfo/i.test(line.text)) state.network.dnsErrorCount += 1;
  if (/offline|network-error|网络恢复|网络错误|ERR_EMPTY_RESPONSE|isShowingNetworkErrorPage/i.test(line.text)) {
    state.network.offlineCount += 1;
  }

  if (state.network.events.length >= MAX_NETWORK_EVENTS) return;

  state.network.events.push({
    id: `network-${state.network.events.length + 1}`,
    timeMs: line.normalizedTimeMs,
    level: line.level,
    category,
    description: sanitizeLogText(description),
  });
}

function getEndpointKey(rawUrl: unknown): string | null {
  const value = readString(rawUrl);
  if (!value) return null;

  try {
    const url = new URL(value, 'https://local.invalid');
    const host = url.host === 'local.invalid' ? 'relative' : url.host;
    return `${host}${url.pathname}`;
  } catch {
    return redactSensitiveText(value.split('?')[0]).slice(0, 120);
  }
}

function addEndpointStat(state: ParserState, endpoint: string, status: unknown): void {
  const existing = state.network.endpointMap.get(endpoint) ?? {
    endpoint,
    count: 0,
    errorCount: 0,
    statusCodes: {},
  };
  existing.count += 1;

  const statusCode = readString(status) ?? 'unknown';
  existing.statusCodes[statusCode] = (existing.statusCodes[statusCode] ?? 0) + 1;
  const numericStatus = toNumber(status);
  if (numericStatus !== null && numericStatus >= 400) {
    existing.errorCount += 1;
  }
  state.network.endpointMap.set(endpoint, existing);
}

function readPath<T extends Record<string, unknown>>(target: T | null, path: string[]): unknown {
  let current: unknown = target;
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function addLatencySample(state: ParserState, value: unknown): void {
  const latency = toNumber(value);
  if (latency === null || latency < 0) return;
  state.network.latencySamples.push(latency);
  state.device.networkStrengths.push(latency);
}

function handleSystemInfo(state: ParserState, payload: Record<string, unknown>): void {
  const inner = parseNestedJson(payload.log);
  if (!inner) return;

  state.device.latestSystemInfo = inner;
  addLatencySample(state, inner.networkStrength);

  const networkType = readString(inner.networkType);
  if (networkType) {
    state.network.networkTypes.set(networkType, (state.network.networkTypes.get(networkType) ?? 0) + 1);
  }
}

function handleDeviceProfile(state: ParserState, payload: Record<string, unknown>): void {
  state.device.profile = payload;
}

function handleWebPayload(state: ParserState, line: ParsedLogLine, payload: Record<string, unknown>): void {
  const endpoint = getEndpointKey(payload.url);
  const response = readPath(payload, ['response']) as Record<string, unknown> | undefined;
  if (endpoint) {
    addEndpointStat(state, endpoint, response?.status);
  }
  const responseCode = readString(readPath(response ?? null, ['data', 'code']));
  const httpFailureReason = buildHttpFailureReason(response?.status, responseCode);
  if (httpFailureReason) {
    addFailureReason(
      state,
      line,
      httpFailureReason,
      endpoint ? `${endpoint} -> ${httpFailureReason.label}` : line.text
    );
  }

  const reqData = parseNestedJson(readPath(payload, ['request', 'reqData']));
  if (reqData) {
    addLatencySample(state, reqData.networkDelay);
    addLatencySample(state, reqData.networkLatencyTp99);

    const condition = parseNestedJson(reqData.networkCondition);
    if (condition) {
      const urlTime = condition.urlTime;
      if (Array.isArray(urlTime)) {
        for (const item of urlTime) {
          if (item && typeof item === 'object') {
            addLatencySample(state, (item as Record<string, unknown>).time);
          }
        }
      }
    }
  }

  if (endpoint && /network|device\/report|operate\/device|http|api/i.test(endpoint)) {
    const status = readString(response?.status) ?? 'unknown';
    const statusText = responseCode ? `${status}, code ${responseCode}` : status;
    addNetworkEvent(state, line, 'HTTP', `${endpoint} -> ${statusText}`);
  }
}

function applyDeviceRules(state: ParserState, line: ParsedLogLine): void {
  const text = line.text;

  const appVersion = text.match(/appVersion:\s*'([^']+)'/i)?.[1];
  const osVersion = text.match(/osVersion:\s*'([^']+)'/i)?.[1];
  const electronVer = text.match(/electronVer:\s*'([^']+)'/i)?.[1];
  const buildOS = text.match(/buildOS:\s*'([^']+)'/i)?.[1];
  if (appVersion) state.device.appVersion = appVersion;
  if (osVersion) state.device.osVersion = osVersion;
  if (electronVer) state.device.electronVer = electronVer;
  if (buildOS) state.device.buildOS = buildOS;

  const payload = extractJsonObject(text);
  if (!payload) return;

  if (/system info/i.test(text)) {
    handleSystemInfo(state, payload);
  }
  if (/DeviceProfile/i.test(text)) {
    handleDeviceProfile(state, payload);
  }
}

function applyNetworkRules(state: ParserState, line: ParsedLogLine): void {
  const text = line.text;
  const payload = extractJsonObject(text);
  if (payload && (payload.url || payload.request || payload.response)) {
    handleWebPayload(state, line, payload);
  }

  if (/system info/i.test(text)) {
    const networkType = readString(state.device.latestSystemInfo?.networkType);
    const strength = readString(state.device.latestSystemInfo?.networkStrength);
    if (networkType || strength) {
      addNetworkEvent(state, line, '系统网络快照', `${networkType ?? 'unknown'} / ${strength ?? 'unknown'}`);
    }
  }

  if (!/网络|network|HttpDNS|DNS|HTTP|HTTPS|Proxy|fetch|request|response|timeout|超时|ENOTFOUND|ECONNRESET|ERR_|online|offline|getNetworkStrength|networkReport|网络恢复|加载失败|Target Socket Error|Leopard report failed/i.test(text)) {
    return;
  }

  let category = '网络日志';
  if (/HttpDNS|DNS|ENOTFOUND|getaddrinfo/i.test(text)) category = 'DNS';
  if (/Proxy|Target Socket/i.test(text)) category = '代理';
  if (/getNetworkStrength|networkStrength|networkDelay|networkLatency/i.test(text)) category = '网络探测';
  if (/offline|online|network-error|网络恢复|加载失败|ERR_/i.test(text)) category = '连通性';
  if (/ReportManager|Leopard report/i.test(text)) category = '日志上报';

  addNetworkEvent(state, line, category);
}

function processLine(state: ParserState, lineText: string): void {
  const line = parseLine(lineText, state);
  if (line.normalizedTimeMs === null && state.previousParsedLine) {
    line.normalizedTimeMs = state.previousParsedLine.normalizedTimeMs;
    line.timeMs = state.previousParsedLine.timeMs;
  }

  applyDeviceRules(state, line);
  applyNetworkRules(state, line);
  applyLaunchRules(state, line);
  state.previousParsedLine = line;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function formatRatio(count: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function buildFailureReasons(state: ParserState): NetworkFailureReasonStat[] {
  const total = [...state.network.failureReasonMap.values()]
    .reduce((sum, reason) => sum + reason.count, 0);

  return [...state.network.failureReasonMap.values()]
    .map((reason) => ({
      ...reason,
      ratio: formatRatio(reason.count, total),
    }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function buildLayerSummary(failureReasons: NetworkFailureReasonStat[]) {
  const totalCount = failureReasons.reduce((sum, reason) => sum + reason.count, 0);
  const networkCount = failureReasons
    .filter((reason) => reason.layer === 'network')
    .reduce((sum, reason) => sum + reason.count, 0);
  const businessCount = totalCount - networkCount;

  return {
    totalCount,
    networkCount,
    businessCount,
    networkRatio: formatRatio(networkCount, totalCount),
    businessRatio: formatRatio(businessCount, totalCount),
  };
}

function formatNetworkTimelineDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 10_000) return `${Math.round(ms)}ms`;
  if (ms < 120_000) return `${(ms / 1000).toFixed(1)}s`;
  return formatDuration(ms).replace(/\s+/g, '');
}

function getLaunchConfigContext(launch: ColdStartLaunch, firstFailure?: NetworkState['failureOccurrences'][number]): string {
  const configStage = launch.stages.find((stage) => (
    /Horn|RemoteConfig|远程配置|HttpDNS/i.test(`${stage.name} ${stage.evidence}`)
  ));

  if (!configStage) {
    return firstFailure
      ? `${firstFailure.layer === 'network' ? '网络层' : '业务层'}异常`
      : '未见配置异常';
  }

  const evidence = `${configStage.name} ${configStage.evidence}`;
  const duration = formatNetworkTimelineDuration(configStage.durationMs);

  if (/S3|降级/i.test(evidence) && /失败|fail/i.test(evidence)) {
    return `失败->S3降级(${duration})`;
  }
  if (/失败|均拉取失败|使用默认|fallback|降级|fail/i.test(evidence)) {
    return `失败->降级(${duration})`;
  }
  if (/成功|已返回|完成|success/i.test(evidence)) {
    return `成功(${duration})`;
  }

  return `${configStage.name}(${duration})`;
}

function getFailureOutcome(description: string, layer: NetworkFailureLayer): string {
  if (/network-error|网络错误页/i.test(description)) return '降级 network-error';
  if (/鉴权|未授权|unauthorized|forbidden|HTTP 40[13]/i.test(description)) return '业务鉴权失败';
  if (/DNS|ENOTFOUND|getaddrinfo/i.test(description)) return 'DNS 解析失败';
  if (/timeout|超时|AbortError/i.test(description)) return '请求超时';
  return layer === 'network' ? '网络层失败' : '业务层失败';
}

function findRecoveryEvent(
  state: ParserState,
  launch: ColdStartLaunch,
  firstFailure: NetworkState['failureOccurrences'][number]
): NetworkEvent | undefined {
  if (firstFailure.timeMs === null) return undefined;
  const windowEndMs = launch.startMs + STARTUP_WINDOW_MS;

  return state.network.events.find((event) => (
    event.timeMs !== null &&
    event.timeMs > (firstFailure.timeMs ?? 0) &&
    event.timeMs <= windowEndMs &&
    /网络恢复|恢复|online|重连|retry success|success|成功/i.test(event.description)
  ));
}

function buildStartupNetworkResults(state: ParserState): StartupNetworkResult[] {
  return state.launches.map((launch, index) => {
    const windowEndMs = launch.endMs + 5_000;
    const failures = state.network.failureOccurrences
      .filter((failure) => (
        failure.timeMs !== null &&
        failure.timeMs >= launch.startMs &&
        failure.timeMs <= windowEndMs
      ))
      .sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
    const firstFailure = failures[0];
    const recoveryEvent = firstFailure ? findRecoveryEvent(state, launch, firstFailure) : undefined;
    const result: StartupNetworkResult['result'] = firstFailure ? 'failed' : 'success';
    const context = getLaunchConfigContext(launch, firstFailure);
    const failureOutcome = firstFailure
      ? getFailureOutcome(firstFailure.description, firstFailure.layer)
      : '';
    const recoveryDetail = firstFailure && recoveryEvent?.timeMs !== null && recoveryEvent?.timeMs !== undefined
      ? `，后 ${formatNetworkTimelineDuration(recoveryEvent.timeMs - (firstFailure.timeMs ?? recoveryEvent.timeMs))} 恢复`
      : '';

    return {
      launchId: launch.id,
      index: index + 1,
      startMs: launch.startMs,
      context,
      result,
      durationMs: launch.durationMs,
      failureCode: firstFailure?.code,
      detail: firstFailure
        ? `${failureOutcome}${recoveryDetail || `，启动窗口内 ${failures.length} 次失败`}`
        : `首屏直接成功（${formatNetworkTimelineDuration(launch.durationMs)}）`,
    };
  });
}

function valueText(value: unknown): string | null {
  const text = readString(value);
  return text ? redactSensitiveText(text) : null;
}

function formatCapacity(value: unknown, unit: 'gb' | 'mb'): string | null {
  const text = valueText(value);
  if (!text) return null;
  if (/[kmgt]b/i.test(text)) return text.replace(/([0-9])([kmgt]b)/i, '$1 $2').toUpperCase();

  const numeric = toNumber(value);
  if (numeric === null) return text;
  const gb = unit === 'mb' ? numeric / 1024 : numeric;
  const display = Number.isInteger(gb) ? String(gb) : gb >= 10 ? gb.toFixed(1) : gb.toFixed(2);
  return `${display} GB`;
}

function buildDeviceInfo(state: ParserState): DeviceInfoItem[] {
  const profile = state.device.profile;
  const systemInfo = state.device.latestSystemInfo;
  const diskInfo = parseNestedJson(systemInfo?.diskInfo);
  const appDetails = [
    state.device.appVersion ? `App ${state.device.appVersion}` : '',
    state.device.electronVer ? `Electron ${state.device.electronVer}` : '',
    state.device.buildOS ? `Build ${state.device.buildOS}` : '',
  ].filter(Boolean);
  const osValue =
    valueText(profile?.osDistribution) ||
    [valueText(profile?.osPlatform), valueText(profile?.osRelease), valueText(profile?.osArch)]
      .filter(Boolean)
      .join(' ') ||
    (state.device.osVersion ? `OS ${state.device.osVersion}` : null);
  const deviceValue = [valueText(profile?.deviceManufacturer), valueText(profile?.deviceModel)]
    .filter(Boolean)
    .join(' / ');
  const cpuValue = [
    valueText(profile?.cpuBrand),
    profile?.cpuPhysicalCores ? `${profile.cpuPhysicalCores} cores` : '',
    profile?.cpuSpeedGHz ? `${profile.cpuSpeedGHz}GHz` : '',
  ].filter(Boolean).join(' / ');
  const memValue = [
    formatCapacity(profile?.memTotalGB, 'gb') ?? formatCapacity(systemInfo?.systemTotalMemory, 'mb'),
    profile?.memUsageRate ? `使用率 ${profile.memUsageRate}%` : (
      systemInfo?.systemMemoryUsageRate ? `使用率 ${systemInfo.systemMemoryUsageRate}%` : ''
    ),
  ].filter(Boolean).join(' / ');
  const diskValue = [
    valueText(profile?.diskName),
    valueText(profile?.diskType),
    formatCapacity(profile?.diskCapacityGB, 'gb') ?? formatCapacity(diskInfo?.totalCapacity, 'gb') ?? '',
    diskInfo?.usageRate ? `使用率 ${diskInfo.usageRate}%` : '',
  ].filter(Boolean).join(' / ');
  const gpuValue = [
    valueText(profile?.gpuVendor),
    valueText(profile?.gpuModel),
    profile?.gpuVramMB ? `${profile.gpuVramMB}MB VRAM` : '',
  ].filter(Boolean).join(' / ');
  const networkValue = [
    valueText(systemInfo?.networkType) || valueText(profile?.netType),
    valueText(systemInfo?.networkStrength) ? `延迟 ${valueText(systemInfo?.networkStrength)}` : '',
    valueText(systemInfo?.ipAddress) ? `IP ${valueText(systemInfo?.ipAddress)}` : '',
  ].filter(Boolean).join(' / ');

  return [
    { label: '应用版本', value: appDetails.join(' / ') || '未识别' },
    { label: '操作系统', value: osValue || '未识别' },
    { label: '设备型号', value: deviceValue || valueText(profile?.deviceFormFactor) || '未识别' },
    { label: 'CPU', value: cpuValue || '未识别' },
    { label: '内存', value: memValue || '未识别' },
    { label: '磁盘', value: diskValue || '未识别' },
    { label: '显卡', value: gpuValue || '未识别' },
    { label: '网络', value: networkValue || '未识别' },
  ];
}

function mergeStagesWithinLaunch(stages: ColdStartStage[]): ColdStartStage[] {
  const map = new Map<string, ColdStartStage>();

  for (const stage of stages) {
    const key = `${stage.name}:${stage.operationType}`;
    const current = map.get(key);

    if (!current || stage.durationMs > current.durationMs) {
      map.set(key, stage);
    }
  }

  return [...map.values()];
}

function buildStageRanking(launches: ColdStartLaunch[]): StageRankingItem[] {
  const map = new Map<string, StageRankingItem>();

  for (const launch of launches) {
    for (const stage of mergeStagesWithinLaunch(launch.stages)) {
      const key = `${stage.name}:${stage.operationType}`;
      const current = map.get(key) ?? {
        name: stage.name,
        operationType: stage.operationType,
        count: 0,
        totalMs: 0,
        maxMs: 0,
        averageMs: 0,
        evidence: stage.evidence,
      };
      current.count += 1;
      current.totalMs += stage.durationMs;
      if (stage.durationMs >= current.maxMs) {
        current.maxMs = stage.durationMs;
        current.evidence = stage.evidence;
      }
      current.averageMs = current.totalMs / current.count;
      map.set(key, current);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.maxMs - a.maxMs || b.averageMs - a.averageMs)
    .map((item) => ({
      ...item,
      totalMs: Math.round(item.totalMs),
      maxMs: Math.round(item.maxMs),
      averageMs: Math.round(item.averageMs),
    }));
}

function buildNetworkAnalysis(state: ParserState): LocalNetworkAnalysis {
  const latencies = state.network.latencySamples.filter((value) => Number.isFinite(value) && value >= 0);
  const avgLatency = average(latencies);
  const p95Latency = percentile(latencies, 95);
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : null;
  const topNetworkType = [...state.network.networkTypes.entries()].sort((a, b) => b[1] - a[1])[0];
  const failureReasons = buildFailureReasons(state);
  const layerSummary = buildLayerSummary(failureReasons);
  const startupResults = buildStartupNetworkResults(state);
  const endpointStats = [...state.network.endpointMap.values()]
    .sort((a, b) => b.errorCount - a.errorCount || b.count - a.count)
    .slice(0, MAX_ENDPOINTS);
  const networkStatus: 'good' | 'warn' | 'bad' =
    state.network.dnsErrorCount > 0 || state.network.offlineCount > 0
      ? 'bad'
      : avgLatency !== null && avgLatency > 1500
        ? 'warn'
        : 'good';

  const stats = [
    {
      label: '网络类型',
      value: topNetworkType?.[0] ?? '未识别',
      detail: topNetworkType ? `${topNetworkType[1]} 次快照` : undefined,
      status: 'good' as const,
    },
    {
      label: '平均延迟',
      value: avgLatency === null ? '无样本' : formatDuration(avgLatency),
      detail: p95Latency === null ? undefined : `P95 ${formatDuration(p95Latency)}`,
      status: networkStatus,
    },
    {
      label: '最大延迟',
      value: maxLatency === null ? '无样本' : formatDuration(maxLatency),
      detail: `${latencies.length} 个延迟样本`,
      status: maxLatency !== null && maxLatency > 3000 ? 'bad' as const : 'good' as const,
    },
    {
      label: '异常日志',
      value: `${state.network.errorCount} 条`,
      detail: `DNS ${state.network.dnsErrorCount} / 超时 ${state.network.timeoutCount}`,
      status: state.network.errorCount > 0 ? 'bad' as const : 'good' as const,
    },
    {
      label: '连通性事件',
      value: `${state.network.offlineCount} 条`,
      detail: 'offline / network-error / 加载失败',
      status: state.network.offlineCount > 0 ? 'bad' as const : 'good' as const,
    },
  ];

  const descriptions = [
    latencies.length > 0
      ? `检测到 ${latencies.length} 个网络延迟样本，平均 ${formatDuration(avgLatency ?? 0)}，P95 ${formatDuration(p95Latency ?? 0)}。`
      : '未检测到可量化的网络延迟样本。',
    state.network.dnsErrorCount > 0
      ? `DNS/域名解析相关异常 ${state.network.dnsErrorCount} 条，需重点关注 ENOTFOUND、HttpDNS 预热或本地 DNS 环境。`
      : '未发现明显 DNS 解析异常。',
    state.network.offlineCount > 0
      ? `存在 ${state.network.offlineCount} 条连通性/网络错误页相关日志，启动期可能受网络可达性影响。`
      : '未发现明显 offline 或网络错误页切换记录。',
    endpointStats.length > 0
      ? `共识别 ${endpointStats.length} 个高频接口/端点，错误数最高的是 ${endpointStats[0].endpoint}。`
      : '未识别到结构化接口请求统计。',
  ];

  return {
    stats,
    descriptions,
    events: state.network.events,
    endpoints: endpointStats,
    latencySamples: latencies.slice(0, 200),
    layerSummary,
    failureReasons,
    startupResults,
  };
}

async function processChunkedFile(
  file: File,
  state: ParserState,
  onProgress?: (progress: ParseProgress) => void
): Promise<{ lineCount: number; bytesRead: number }> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder('utf-8');
  let leftover = '';
  let lineCount = 0;
  let bytesRead = 0;
  let lastProgressAt = 0;

  const emitProgress = (force = false) => {
    const now = performance.now();
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    onProgress?.({ bytesRead, lineCount });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    const chunk = decoder.decode(value, { stream: true });
    const combined = leftover + chunk;
    const lines = combined.split(/\r?\n/);
    leftover = lines.pop() ?? '';

    for (const line of lines) {
      lineCount += 1;
      processLine(state, line);
    }
    emitProgress();
  }

  const tail = decoder.decode();
  if (tail) leftover += tail;
  if (leftover) {
    lineCount += 1;
    processLine(state, leftover.endsWith('\r') ? leftover.slice(0, -1) : leftover);
  }
  emitProgress(true);

  return { lineCount, bytesRead };
}

export async function parseLogFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<LocalLogAnalysis> {
  const state = createParserState();
  const { lineCount } = await processChunkedFile(file, state, onProgress);
  finalizeCurrentLaunch(state);

  const launches = state.launches.filter((launch) => launch.stages.length > 0);
  const stageRanking = buildStageRanking(launches);
  const network = buildNetworkAnalysis(state);

  return {
    fileName: file.name,
    fileSize: file.size,
    lineCount,
    analyzedAt: Date.now(),
    deviceInfo: buildDeviceInfo(state),
    launches,
    stageRanking,
    network,
    privacyNote: 'AI 模式仅发送脱敏后的阶段摘要、设备概览和网络统计，不发送完整日志原文。',
  };
}
