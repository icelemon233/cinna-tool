import { net } from 'electron';
import type {
  AppLocale,
  GithubTrendingItem,
  HomeDashboardData,
  HomeDashboardOptions,
  HomeSummaryReason,
  HomeSummaryState,
  HomeNewsItem,
  ModelInfo,
  TrendingPeriod,
} from '../types';
import { loadConfig } from '../utils/jsonStore';
import { getModelList } from './models';

const AI_NEWS_LIMIT = 20;
const AI_SUMMARY_NEWS_LIMIT = 8;
const AI_SUMMARY_REPO_LIMIT = 6;
const AI_SUMMARY_TIMEOUT_MS = 30_000;
const HOME_DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const HOME_FEED_TIMEOUT_MS = 8_000;

interface NewsFeedSource {
  name: string;
  url: string;
}

const NEWS_FEED_SOURCES: NewsFeedSource[] = [
  { name: '钛媒体', url: 'https://www.tmtpost.com/rss.xml' },
  { name: '36氪', url: 'https://www.36kr.com/feed' },
  { name: '智东西', url: 'https://zhidx.com/rss.xml' },
  { name: 'TechWeb', url: 'https://www.techweb.com.cn/rss/allnews.xml' },
  { name: '量子位', url: 'https://www.qbitai.com/feed' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/' },
];

const AI_NEWS_KEYWORDS = [
  'ai',
  'agi',
  'aigc',
  'agent',
  'claude',
  'deepseek',
  'gemini',
  'gpt',
  'llm',
  'nvidia',
  'openai',
  '人工智能',
  '大模型',
  '多模态',
  '生成式',
  '智能体',
  '算力',
  'ai芯片',
  '机器学习',
  '机器人',
  '具身智能',
  '推理',
  '训练',
];

const NON_CORE_AI_NEWS_KEYWORDS = [
  'fifa',
  '世界杯',
  '足球',
  '篮球',
  '体育',
  '赛事',
  '联赛',
  '氪星晚报',
  '早报',
  '赛车',
  '买车',
  '购车',
  '卖车',
  '新车',
  '车型',
  '车展',
  '车市',
  '汽车',
  '电动车',
  '车企',
  '智驾',
  '自动驾驶',
  '高考',
  '志愿',
  '鼠标',
  '键盘',
  '耳机',
  '外设',
  '显示器',
  '游戏本',
  '路由器',
  '扫拖',
  '扫地',
  '清洁',
  '元起',
  '发售',
  '开售',
];

const COMMERCE_PROMOTION_KEYWORDS = [
  '618',
  '双11',
  '双十一',
  '双12',
  '双十二',
  '大促',
  '促销',
  '折扣',
  '优惠',
  '优惠券',
  '领券',
  '券后',
  '红包',
  '满减',
  '秒杀',
  '直降',
  '补贴',
  '百亿补贴',
  '到手价',
  '好价',
  '低至',
  '低价',
  '历史低价',
  '价格新低',
  '售价',
  '预售',
  '开卖',
  '开抢',
  '现货',
  '包邮',
  '下单',
  '入手',
  '购买',
  '买一送一',
  '以旧换新',
  '带货',
  '直播间',
  '购物',
  '购物节',
  '囤货',
  '爆款',
  '清仓',
  '特价',
  '京东',
  '天猫',
  '淘宝',
  '拼多多',
  '苏宁易购',
  '抖音商城',
  '什么值得买',
  '值得买',
  '官方旗舰店',
  '旗舰店',
  '商城',
];

const NEWS_PER_SOURCE_LIMIT = 5;

interface ChatSettingsSnapshot {
  modelId?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

interface EffectiveChatConfig {
  modelId: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

type AiSummaryError = Error & {
  reason?: HomeSummaryReason;
};

interface DashboardCacheEntry {
  data: HomeDashboardData;
  expiresAt: number;
}

const dashboardCache = new Map<string, DashboardCacheEntry>();
const pendingDashboardRequests = new Map<string, Promise<HomeDashboardData>>();

const TEXT_DECODER_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, entity) => TEXT_DECODER_ENTITIES[entity] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function createAiSummaryError(message: string, reason: HomeSummaryReason): AiSummaryError {
  const error = new Error(message) as AiSummaryError;
  error.reason = reason;
  return error;
}

function getAiSummaryErrorReason(error: unknown): HomeSummaryReason {
  if (error instanceof Error && 'reason' in error) {
    const reason = (error as AiSummaryError).reason;
    if (reason) return reason;
  }

  return 'request';
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '));
}

function getHttpErrorReason(status: number): HomeSummaryReason {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  return 'request';
}

function getHttpErrorMessage(status: number, body?: { error?: { message?: string } }): string {
  const serverMessage = body?.error?.message;
  switch (status) {
    case 401:
      return serverMessage || 'API Key 无效或已过期';
    case 403:
      return serverMessage || '无权访问该 API，请检查 API Key 权限';
    case 429:
      return serverMessage || '请求频率超限，请稍后重试';
    default:
      if (status >= 500) {
        return serverMessage || `AI 服务端错误 (HTTP ${status})`;
      }
      return serverMessage || `AI 请求失败 (HTTP ${status})`;
  }
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchText(url: string, timeoutMs = HOME_FEED_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await net.fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36 CinnaTool/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain,*/*',
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeNewsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'fbclid' || key === 'gclid') {
        parsed.searchParams.delete(key);
      }
    }
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function hasKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  if (/^[a-z0-9.+-]+$/.test(normalizedKeyword)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(normalizedKeyword);
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => hasKeyword(text, keyword));
}

function isAiNewsCandidate(item: HomeNewsItem, description = ''): boolean {
  const text = `${item.title} ${item.source} ${description}`.toLowerCase();
  if (
    hasAnyKeyword(text, NON_CORE_AI_NEWS_KEYWORDS) ||
    hasAnyKeyword(text, COMMERCE_PROMOTION_KEYWORDS)
  ) {
    return false;
  }
  return hasAnyKeyword(text, AI_NEWS_KEYWORDS);
}

function readFeedTag(block: string, tagName: string): string {
  const tag = escapeRegExp(tagName);
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function readFeedLink(block: string): string {
  const link = readFeedTag(block, 'link');
  if (link.startsWith('http')) return link;

  const atomLink = block.match(/<link[^>]+href="([^"]+)"/i);
  if (atomLink) return decodeHtml(atomLink[1]);

  const guid = readFeedTag(block, 'guid');
  return guid.startsWith('http') ? guid : '';
}

function readFeedDate(block: string): string {
  return (
    readFeedTag(block, 'pubDate') ||
    readFeedTag(block, 'published') ||
    readFeedTag(block, 'updated') ||
    readFeedTag(block, 'dc:date')
  );
}

function parseNewsFeed(xml: string, source: NewsFeedSource): HomeNewsItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks
    .map((block) => {
      const title = readFeedTag(block, 'title');
      const url = readFeedLink(block);
      const description = stripTags(
        readFeedTag(block, 'description') ||
        readFeedTag(block, 'content:encoded') ||
        readFeedTag(block, 'summary')
      );

      return {
        item: {
          title,
          source: source.name,
          url,
          publishedAt: readFeedDate(block),
        },
        description,
      };
    })
    .filter(({ item, description }) => Boolean(item.title && item.url && isAiNewsCandidate(item, description)))
    .map(({ item }) => item);
}

function getTimestamp(item: HomeNewsItem): number {
  const timestamp = Date.parse(item.publishedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function fetchNews(_locale: AppLocale): Promise<HomeNewsItem[]> {
  const sourceResults = await Promise.allSettled(
    NEWS_FEED_SOURCES.map(async (source) => ({
      source,
      items: parseNewsFeed(await fetchText(source.url), source),
    }))
  );
  const deduped = new Map<string, HomeNewsItem>();
  const buckets: HomeNewsItem[][] = [];

  for (const result of sourceResults) {
    if (result.status !== 'fulfilled') continue;

    const bucket: HomeNewsItem[] = [];
    for (const item of result.value.items.sort((a, b) => getTimestamp(b) - getTimestamp(a))) {
      const key = normalizeNewsUrl(item.url) || item.title.toLowerCase();
      if (deduped.has(key)) continue;

      deduped.set(key, item);
      bucket.push(item);
      if (bucket.length >= NEWS_PER_SOURCE_LIMIT) {
        break;
      }
    }
    buckets.push(bucket);
  }

  const items: HomeNewsItem[] = [];
  for (let index = 0; items.length < AI_NEWS_LIMIT; index += 1) {
    let added = false;
    for (const bucket of buckets) {
      if (bucket[index]) {
        items.push(bucket[index]);
        added = true;
      }
      if (items.length >= AI_NEWS_LIMIT) break;
    }
    if (!added) break;
  }

  return items;
}

function parseNumber(value: string): number {
  const normalized = value.replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : 0;
}

function cleanTrendingDescription(description: string, owner: string, repo: string): string {
  return description
    .replace(new RegExp(`^Star\\s+${owner}\\s*\\/\\s*${repo}\\s*`, 'i'), '')
    .replace(/^Star\s+/i, '')
    .trim();
}

function parseTrending(html: string): GithubTrendingItem[] {
  const articles = html.match(/<article[\s\S]*?<\/article>/g) ?? [];
  return articles
    .map((article) => {
      const headingMatch = article.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"\/]+)\/([^"\/]+)"[\s\S]*?<\/a>\s*<\/h2>/i);
      const repoMatch = headingMatch ?? article.match(/href="\/([^"\/]+)\/([^"\/]+)\/stargazers"/);
      const owner = decodeHtml(repoMatch?.[1] ?? '');
      const repo = decodeHtml(repoMatch?.[2] ?? '');
      const descriptionMatch = article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const languageMatch = article.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/i);
      const starsMatch = article.match(/href="\/[^"]+\/stargazers"[^>]*>\s*([\s\S]*?)\s*<\/a>/i);
      const periodStarsMatch = article.match(/(\d[\d,]*)\s+stars?\s+[^<]*(today|this week|this month)/i);

      return {
        name: owner && repo ? `${owner}/${repo}` : stripTags(article).slice(0, 80),
        owner,
        repo,
        description: descriptionMatch
          ? cleanTrendingDescription(stripTags(descriptionMatch[1]), owner, repo)
          : '',
        url: owner && repo ? `https://github.com/${owner}/${repo}` : 'https://github.com/trending',
        language: languageMatch ? stripTags(languageMatch[1]) : '',
        stars: starsMatch ? stripTags(starsMatch[1]) : '',
        periodStars: periodStarsMatch?.[1] ?? '',
      };
    })
    .sort((a, b) => {
      const periodDiff = parseNumber(b.periodStars) - parseNumber(a.periodStars);
      if (periodDiff !== 0) return periodDiff;
      return parseNumber(b.stars) - parseNumber(a.stars);
    })
    .slice(0, 10);
}

async function fetchGithubTrending(period: TrendingPeriod): Promise<GithubTrendingItem[]> {
  const since = period === 'yearly' ? 'monthly' : period;
  const html = await fetchText(`https://github.com/trending?since=${since}`);
  return parseTrending(html);
}

function readChatSettings(): ChatSettingsSnapshot | null {
  const config = loadConfig();
  const settings = config.config;
  return settings && typeof settings === 'object'
    ? settings as ChatSettingsSnapshot
    : null;
}

function normalizeChatConfig(settings: ChatSettingsSnapshot | null, models: ModelInfo[]): EffectiveChatConfig | null {
  if (!settings) return null;

  const selectedModel = models.find((model) => model.id === settings.modelId);
  const baseUrl = (selectedModel && !selectedModel.requiresUrl ? selectedModel.baseUrl : settings.baseUrl)?.trim() || '';
  const model = (selectedModel && !selectedModel.requiresUrl ? selectedModel.model : settings.model)?.trim() || '';
  const modelId = (selectedModel?.id || settings.modelId || '').trim();
  const apiKey = settings.apiKey?.trim() || '';

  if (!apiKey || !baseUrl || !model) return null;

  return {
    modelId,
    model,
    baseUrl,
    apiKey,
    systemPrompt: settings.systemPrompt?.trim() || 'You are a helpful assistant.',
    temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.45,
    topP: typeof settings.topP === 'number' ? settings.topP : 0.9,
    maxTokens: Math.min(
      Math.max(typeof settings.maxTokens === 'number' ? settings.maxTokens : 900, 300),
      1200
    ),
  };
}

function getHomeAiConfig(): EffectiveChatConfig | null {
  return normalizeChatConfig(readChatSettings(), getModelList());
}

function buildHomeSummary(
  locale: AppLocale,
  news: HomeNewsItem[],
  trending: GithubTrendingItem[],
  period: TrendingPeriod
): string {
  const topNews = news.slice(0, 3).map((item) => item.title).filter(Boolean);
  const topRepos = trending.slice(0, 3).map((item) => item.name).filter(Boolean);

  if (locale === 'zh') {
    const periodLabel = period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '近期';
    return `${periodLabel}信息流里，新闻侧重点集中在${topNews.join('、') || '热点事件'}；开发者社区里 ${topRepos.join('、') || '热门项目'} 受到关注。可以优先关注新闻里的现实议题，并结合 GitHub 趋势判断技术方向。`;
  }

  const periodLabel = period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'recently';
  return `For ${periodLabel}, the news stream is led by ${topNews.join(', ') || 'major headlines'}, while GitHub attention clusters around ${topRepos.join(', ') || 'popular repositories'}. Watch both the public agenda and developer momentum for a balanced daily read.`;
}

function buildAiSummaryPrompt(
  locale: AppLocale,
  period: TrendingPeriod,
  news: HomeNewsItem[],
  trending: GithubTrendingItem[]
): string {
  const periodLabel = locale === 'zh'
    ? period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '近期'
    : period === 'daily' ? 'today' : period === 'weekly' ? 'this week' : 'recently';
  const newsLines = news.slice(0, AI_SUMMARY_NEWS_LIMIT).map((item, index) =>
    `${index + 1}. [${item.source}] ${item.title}`
  );
  const repoLines = trending.slice(0, AI_SUMMARY_REPO_LIMIT).map((item, index) => {
    const metrics = [item.language, item.stars ? `${item.stars} stars` : '', item.periodStars ? `+${item.periodStars}` : '']
      .filter(Boolean)
      .join(', ');
    return `${index + 1}. ${item.name}${metrics ? ` (${metrics})` : ''}${item.description ? ` - ${item.description}` : ''}`;
  });

  if (locale === 'zh') {
    return [
      `请基于以下 ${periodLabel} AI 科技热点和 GitHub 趋势，写一段中文「今日总结」。`,
      '要求：120-180 字；只总结重点趋势，不编造未提供的信息；不要使用标题、列表或 Markdown。',
      '',
      'AI 科技热点：',
      newsLines.join('\n') || '暂无',
      '',
      'GitHub 趋势：',
      repoLines.join('\n') || '暂无',
    ].join('\n');
  }

  return [
    `Write a concise ${periodLabel} summary from the AI/tech headlines and GitHub trends below.`,
    'Requirements: 80-120 words, trend-focused, no invented facts, no heading, no bullets, no Markdown.',
    '',
    'AI/tech headlines:',
    newsLines.join('\n') || 'None',
    '',
    'GitHub trends:',
    repoLines.join('\n') || 'None',
  ].join('\n');
}

async function fetchJson(
  url: string,
  init: Parameters<typeof net.fetch>[1],
  timeoutMs = AI_SUMMARY_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await net.fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw createAiSummaryError(
        getHttpErrorMessage(response.status, body as { error?: { message?: string } }),
        getHttpErrorReason(response.status)
      );
    }

    return body;
  } catch (error) {
    if (isAbortError(error)) {
      throw createAiSummaryError('AI 总结请求超时，请稍后重试', 'timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOpenAiCompatibleSummary(config: EffectiveChatConfig, prompt: string): Promise<string> {
  const body = await fetchJson(buildChatCompletionsUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a concise AI news analyst.' },
        { role: 'user', content: prompt },
      ],
      temperature: Math.min(config.temperature, 0.6),
      top_p: config.topP,
      max_tokens: config.maxTokens,
      stream: false,
    }),
  });

  const parsed = body as { choices?: Array<{ message?: { content?: string } }> };
  return parsed.choices?.[0]?.message?.content?.trim() || '';
}

async function requestClaudeSummary(config: EffectiveChatConfig, prompt: string): Promise<string> {
  const body = await fetchJson(`${config.baseUrl.replace(/\/+$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      system: 'You are a concise AI news analyst.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: config.maxTokens,
      temperature: Math.min(config.temperature, 0.6),
      top_p: config.topP,
    }),
  });

  const parsed = body as { content?: Array<{ text?: string }> };
  return parsed.content?.map((item) => item.text || '').join('').trim() || '';
}

async function requestGeminiSummary(config: EffectiveChatConfig, prompt: string): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const body = await fetchJson(`${baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: Math.min(config.temperature, 0.6),
        topP: config.topP,
        maxOutputTokens: config.maxTokens,
      },
    }),
  });

  const parsed = body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parsed.candidates?.[0]?.content?.parts?.map((item) => item.text || '').join('').trim() || '';
}

function isClaudeConfig(config: EffectiveChatConfig): boolean {
  return config.modelId === 'claude-3-5-sonnet' || config.baseUrl.includes('api.anthropic.com') || /^claude-/i.test(config.model);
}

function isGeminiConfig(config: EffectiveChatConfig): boolean {
  return config.modelId === 'gemini-2-flash' || config.baseUrl.includes('generativelanguage.googleapis.com');
}

async function generateAiSummary(
  locale: AppLocale,
  period: TrendingPeriod,
  news: HomeNewsItem[],
  trending: GithubTrendingItem[],
  config: EffectiveChatConfig
): Promise<string> {
  const prompt = buildAiSummaryPrompt(locale, period, news, trending);
  const summary = isGeminiConfig(config)
    ? await requestGeminiSummary(config, prompt)
    : isClaudeConfig(config)
      ? await requestClaudeSummary(config, prompt)
      : await requestOpenAiCompatibleSummary(config, prompt);

  if (!summary) {
    throw createAiSummaryError('AI 未返回有效总结', 'empty-response');
  }
  return summary.replace(/\s+/g, ' ').trim();
}

async function fetchHomeDashboardFresh(
  locale: AppLocale,
  period: TrendingPeriod,
  options: HomeDashboardOptions = {}
): Promise<HomeDashboardData> {
  const [news, trending] = await Promise.all([
    fetchNews(locale),
    fetchGithubTrending(period),
  ]);
  const fallbackSummary = buildHomeSummary(locale, news, trending, period);
  const aiConfig = getHomeAiConfig();
  const aiSummaryEnabled = Boolean(options.aiSummaryEnabled);
  const summaryState: HomeSummaryState = {
    enabled: aiSummaryEnabled,
    available: Boolean(aiConfig),
    generated: false,
    error: '',
    reason: aiSummaryEnabled ? 'missing-config' : 'disabled',
  };
  let summary = aiSummaryEnabled
    ? locale === 'zh'
      ? '今日总结需要先在 AI Chat 中配置模型、API 地址和 API Key。'
      : 'Today Summary requires a configured model, API base URL, and API key in AI Chat.'
    : locale === 'zh'
      ? '今日总结已关闭。打开开关后，将使用 AI Chat 的模型配置生成总结。'
      : 'Today Summary is off. Turn it on to summarize with the AI Chat model configuration.';

  if (aiSummaryEnabled && aiConfig) {
    try {
      summary = await generateAiSummary(locale, period, news, trending, aiConfig);
      summaryState.generated = true;
      summaryState.reason = 'generated';
    } catch (error) {
      summaryState.error = error instanceof Error ? error.message : String(error);
      summaryState.reason = getAiSummaryErrorReason(error);
      summary = locale === 'zh'
        ? `AI 总结生成失败：${summaryState.error}`
        : `AI summary failed: ${summaryState.error}`;
    }
  } else if (!aiSummaryEnabled) {
    summaryState.error = '';
    summaryState.reason = 'disabled';
  } else {
    summaryState.error = locale === 'zh'
      ? 'AI Chat 配置不完整'
      : 'AI Chat configuration is incomplete';
    summaryState.reason = 'missing-config';
  }

  return {
    news,
    trending,
    summary: summary || fallbackSummary,
    summaryState,
    fetchedAt: Date.now(),
  };
}

export async function fetchHomeDashboard(
  locale: AppLocale,
  period: TrendingPeriod,
  options: HomeDashboardOptions = {}
): Promise<HomeDashboardData> {
  const cacheKey = `${locale}:${period}:${options.aiSummaryEnabled ? 'ai' : 'plain'}`;
  const cached = dashboardCache.get(cacheKey);

  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pending = pendingDashboardRequests.get(cacheKey);
  if (!options.forceRefresh && pending) {
    return pending;
  }

  const request = fetchHomeDashboardFresh(locale, period, options)
    .then((data) => {
      dashboardCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + HOME_DASHBOARD_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      pendingDashboardRequests.delete(cacheKey);
    });

  pendingDashboardRequests.set(cacheKey, request);
  return request;
}
