export type LogAnalysisMode = 'ai' | 'offline';

export type OperationType = 'sync' | 'async';

export type BottleneckPriority = 'P0' | 'P1' | 'P2';

export interface DeviceInfoItem {
  label: string;
  value: string;
  detail?: string;
}

export interface ColdStartStage {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  operationType: OperationType;
  evidence: string;
}

export interface ColdStartLaunch {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  stages: ColdStartStage[];
  eventCount: number;
}

export interface StageRankingItem {
  name: string;
  operationType: OperationType;
  count: number;
  totalMs: number;
  maxMs: number;
  averageMs: number;
  evidence: string;
}

export interface NetworkStatItem {
  label: string;
  value: string;
  detail?: string;
  status?: 'good' | 'warn' | 'bad';
}

export interface NetworkEvent {
  id: string;
  timeMs: number | null;
  level: 'info' | 'warn' | 'error' | 'unknown';
  category: string;
  description: string;
}

export interface NetworkEndpointStat {
  endpoint: string;
  count: number;
  errorCount: number;
  statusCodes: Record<string, number>;
}

export type NetworkFailureLayer = 'network' | 'business';

export interface NetworkFailureLayerSummary {
  totalCount: number;
  networkCount: number;
  businessCount: number;
  networkRatio: number;
  businessRatio: number;
}

export interface NetworkFailureReasonStat {
  code: string;
  label: string;
  layer: NetworkFailureLayer;
  count: number;
  ratio: number;
  scenario: string;
  example: string;
}

export interface StartupNetworkResult {
  launchId: string;
  index: number;
  startMs: number;
  context: string;
  result: 'success' | 'failed' | 'unknown';
  durationMs: number;
  failureCode?: string;
  detail: string;
}

export interface LocalNetworkAnalysis {
  stats: NetworkStatItem[];
  descriptions: string[];
  events: NetworkEvent[];
  endpoints: NetworkEndpointStat[];
  latencySamples: number[];
  layerSummary: NetworkFailureLayerSummary;
  failureReasons: NetworkFailureReasonStat[];
  startupResults: StartupNetworkResult[];
}

export interface AiBottleneck {
  priority: BottleneckPriority;
  title: string;
  stageName?: string;
  impact?: string;
  evidence?: string;
  suggestion: string;
}

export interface AiNetworkIssue {
  priority: BottleneckPriority;
  title: string;
  evidence?: string;
  suggestion: string;
}

export interface AiLogAnalysis {
  coldStartSummary?: string;
  bottlenecks: AiBottleneck[];
  networkSummary?: string;
  networkIssues: AiNetworkIssue[];
  rawText?: string;
}

export interface LocalLogAnalysis {
  fileName: string;
  fileSize: number;
  lineCount: number;
  analyzedAt: number;
  deviceInfo: DeviceInfoItem[];
  launches: ColdStartLaunch[];
  stageRanking: StageRankingItem[];
  network: LocalNetworkAnalysis;
  privacyNote: string;
}

export interface LogAnalysisReport extends LocalLogAnalysis {
  mode: LogAnalysisMode;
  ai?: AiLogAnalysis;
  aiError?: string;
}

export interface ParseProgress {
  bytesRead: number;
  lineCount: number;
}
