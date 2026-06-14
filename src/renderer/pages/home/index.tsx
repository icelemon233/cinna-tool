import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Drawer, Empty, Segmented, Skeleton, Space, Switch, Tag, Tooltip } from 'antd';
import {
  CalendarOutlined,
  CloseOutlined,
  FireOutlined,
  GithubOutlined,
  GlobalOutlined,
  ReloadOutlined,
  RiseOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { GithubTrendingItem, HomeDashboardData, HomeNewsItem, ModelInfo } from '@/shared/types/electron';
import './index.css';

type TrendPeriod = 'daily' | 'weekly' | 'yearly';

interface BrowserDrawerState {
  open: boolean;
  title: string;
  url: string;
}

type HomeCache = Map<string, HomeDashboardData>;
interface HomePreferences {
  aiSummaryEnabled?: boolean;
}

interface ChatConfigSnapshot {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  modelId?: string;
}

interface AiSummaryAvailability {
  available: boolean;
  signature: string;
}

interface LoadDataOptions {
  forceRefresh?: boolean;
  aiSummaryEnabledOverride?: boolean;
  aiConfigSignatureOverride?: string;
}

type HomeWebviewElement = HTMLElement & {
  reload?: () => void;
  stop?: () => void;
};

interface HomePageProps {
  active: boolean;
}

function formatDate(value: string, locale: 'zh' | 'en'): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function getEffectiveAiConfigSnapshot(
  config: ChatConfigSnapshot | null,
  models: ModelInfo[]
): ChatConfigSnapshot | null {
  if (!config) return null;

  const selectedModel = models.find((model) => model.id === config.modelId);
  const baseUrl = (selectedModel && !selectedModel.requiresUrl ? selectedModel.baseUrl : config.baseUrl)?.trim() || '';
  const model = (selectedModel && !selectedModel.requiresUrl ? selectedModel.model : config.model)?.trim() || '';
  const apiKey = config.apiKey?.trim() || '';

  if (!apiKey || !baseUrl || !model) return null;

  return {
    apiKey,
    baseUrl,
    model,
    modelId: selectedModel?.id || config.modelId || '',
  };
}

function getAiConfigSignature(config: ChatConfigSnapshot | null, models: ModelInfo[]): string {
  const effectiveConfig = getEffectiveAiConfigSnapshot(config, models);
  if (!effectiveConfig) return '';
  return [
    effectiveConfig.modelId || '',
    effectiveConfig.model,
    effectiveConfig.baseUrl,
    effectiveConfig.apiKey?.slice(0, 8),
    effectiveConfig.apiKey?.slice(-4),
  ].join('|');
}

const HomePage: React.FC<HomePageProps> = ({ active }) => {
  const { t, locale } = useTranslation();
  const [period, setPeriod] = useState<TrendPeriod>('daily');
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false);
  const [aiSummaryAvailable, setAiSummaryAvailable] = useState(false);
  const [aiConfigSignature, setAiConfigSignature] = useState('');
  const [aiSummaryAvailabilityChecked, setAiSummaryAvailabilityChecked] = useState(false);
  const [summaryPreferenceLoaded, setSummaryPreferenceLoaded] = useState(false);
  const [browser, setBrowser] = useState<BrowserDrawerState>({
    open: false,
    title: '',
    url: '',
  });
  const dashboardCacheRef = useRef<HomeCache>(new Map());
  const latestLoadIdRef = useRef(0);
  const webviewRef = useRef<HTMLElement | null>(null);

  const periodOptions = useMemo(
    () => [
      { label: t('home.period.daily'), value: 'daily' },
      { label: t('home.period.weekly'), value: 'weekly' },
      { label: t('home.period.yearly'), value: 'yearly' },
    ],
    [locale]
  );

  const persistAiSummaryPreference = useCallback((enabled: boolean) => {
    return window.electronAPI?.storeSet?.('home-preferences', { aiSummaryEnabled: enabled }).catch(() => {});
  }, []);

  const loadData = useCallback(async ({
    forceRefresh = false,
    aiSummaryEnabledOverride,
    aiConfigSignatureOverride,
  }: LoadDataOptions = {}) => {
    const shouldUseAiSummary = aiSummaryEnabledOverride ?? aiSummaryEnabled;
    const summaryConfigSignature = aiConfigSignatureOverride ?? aiConfigSignature;
    const cacheKey = `${locale}:${period}:${shouldUseAiSummary ? summaryConfigSignature || 'unconfigured' : 'off'}`;
    const cachedData = dashboardCacheRef.current.get(cacheKey);

    if (!forceRefresh && cachedData) {
      setData(cachedData);
      setError('');
      setLoading(false);
      return;
    }

    const loadId = latestLoadIdRef.current + 1;
    latestLoadIdRef.current = loadId;
    setLoading(true);
    setError('');
    try {
      if (!window.electronAPI?.fetchHomeDashboard) {
        const isElectronRuntime = /\bElectron\//.test(navigator.userAgent);
        setData({
          news: [],
          trending: [],
          summary: t('home.summaryEmpty'),
          summaryState: {
            enabled: shouldUseAiSummary,
            available: false,
            generated: false,
            error: '',
            reason: 'request',
          },
          fetchedAt: Date.now(),
        });
        setError(isElectronRuntime ? t('home.runtimeUnavailable') : t('home.browserUnavailable'));
        return;
      }

      const nextData = await window.electronAPI.fetchHomeDashboard(locale, period, {
        aiSummaryEnabled: shouldUseAiSummary,
      });
      if (loadId !== latestLoadIdRef.current) return;

      if (nextData.summaryState.available !== aiSummaryAvailable) {
        setAiSummaryAvailable(nextData.summaryState.available);
      }

      if (shouldUseAiSummary && (
        !nextData.summaryState.available ||
        nextData.summaryState.reason === 'auth'
      )) {
        setAiSummaryEnabled(false);
        dashboardCacheRef.current.clear();
        persistAiSummaryPreference(false);
        setError(nextData.summaryState.error || t('home.summaryNeedsAiConfig'));
      }

      dashboardCacheRef.current.set(cacheKey, nextData);
      setData(nextData);
    } catch {
      if (loadId === latestLoadIdRef.current) {
        setError(t('home.error'));
      }
    } finally {
      if (loadId === latestLoadIdRef.current) {
        setLoading(false);
      }
    }
  }, [aiConfigSignature, aiSummaryAvailable, aiSummaryEnabled, locale, period, persistAiSummaryPreference, t]);

  const refreshAiSummaryAvailability = useCallback(async (): Promise<AiSummaryAvailability> => {
    if (!window.electronAPI?.storeGet) {
      setAiSummaryAvailable(false);
      setAiConfigSignature('');
      setAiSummaryAvailabilityChecked(true);
      return { available: false, signature: '' };
    }

    try {
      setAiSummaryAvailabilityChecked(false);
      const [config, models] = await Promise.all([
        window.electronAPI.storeGet('config') as Promise<ChatConfigSnapshot | null>,
        window.electronAPI.getModels?.().catch(() => [] as ModelInfo[]) ?? Promise.resolve([] as ModelInfo[]),
      ]);
      const signature = getAiConfigSignature(config, models);
      const available = Boolean(signature);
      setAiSummaryAvailable(available);
      setAiConfigSignature(signature);
      return { available, signature };
    } catch {
      setAiSummaryAvailable(false);
      setAiConfigSignature('');
      return { available: false, signature: '' };
    } finally {
      setAiSummaryAvailabilityChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    refreshAiSummaryAvailability();
  }, [active, refreshAiSummaryAvailability]);

  useEffect(() => {
    if (!active || !summaryPreferenceLoaded || !aiSummaryAvailabilityChecked) return;
    if (aiSummaryEnabled && !aiSummaryAvailable) return;
    loadData();
  }, [
    active,
    aiSummaryAvailabilityChecked,
    aiSummaryAvailable,
    aiSummaryEnabled,
    loadData,
    summaryPreferenceLoaded,
  ]);

  useEffect(() => {
    if (!window.electronAPI?.storeGet) {
      setSummaryPreferenceLoaded(true);
      return;
    }

    let alive = true;
    window.electronAPI.storeGet('home-preferences')
      .then((stored) => {
        if (!alive) return;
        const preferences = stored as HomePreferences | null;
        setAiSummaryEnabled(Boolean(preferences?.aiSummaryEnabled));
      })
      .finally(() => {
        if (alive) setSummaryPreferenceLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!summaryPreferenceLoaded || !aiSummaryAvailabilityChecked || aiSummaryAvailable || !aiSummaryEnabled) return;
    setAiSummaryEnabled(false);
    dashboardCacheRef.current.clear();
    persistAiSummaryPreference(false);
  }, [
    aiSummaryAvailabilityChecked,
    aiSummaryAvailable,
    aiSummaryEnabled,
    persistAiSummaryPreference,
    summaryPreferenceLoaded,
  ]);

  const handleAiSummaryToggle = async (checked: boolean) => {
    if (checked) {
      const availability = await refreshAiSummaryAvailability();
      if (!availability.available) {
        setError(t('home.summaryNeedsAiConfig'));
        setAiSummaryEnabled(false);
        persistAiSummaryPreference(false);
        return;
      }
    }

    setError('');
    setAiSummaryEnabled(checked);
    await persistAiSummaryPreference(checked);
    dashboardCacheRef.current.clear();
  };

  const handleDashboardRefresh = async () => {
    let nextAiSummaryEnabled = aiSummaryEnabled;
    let nextAiConfigSignature = aiConfigSignature;
    let shouldShowConfigError = false;

    if (aiSummaryEnabled) {
      const availability = await refreshAiSummaryAvailability();
      nextAiConfigSignature = availability.signature;
      if (!availability.available) {
        nextAiSummaryEnabled = false;
        shouldShowConfigError = true;
        setAiSummaryEnabled(false);
        dashboardCacheRef.current.clear();
        persistAiSummaryPreference(false);
      }
    } else {
      const availability = await refreshAiSummaryAvailability();
      nextAiConfigSignature = availability.signature;
    }

    await loadData({
      forceRefresh: true,
      aiSummaryEnabledOverride: nextAiSummaryEnabled,
      aiConfigSignatureOverride: nextAiConfigSignature,
    });

    if (shouldShowConfigError) {
      setError(t('home.summaryNeedsAiConfig'));
    }
  };

  const closeBrowserDrawer = useCallback(() => {
    const webview = webviewRef.current as HomeWebviewElement | null;
    webview?.stop?.();
    webview?.setAttribute('src', 'about:blank');
    setBrowser({ open: false, title: '', url: '' });
  }, []);

  const handleBrowserClosePointerDown = useCallback((
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    closeBrowserDrawer();
  }, [closeBrowserDrawer]);

  const handleBrowserCloseClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    closeBrowserDrawer();
  }, [closeBrowserDrawer]);

  useEffect(() => {
    if (!browser.open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeBrowserDrawer();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.home-browser-drawer .ant-drawer-content-wrapper')) return;
      closeBrowserDrawer();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [browser.open, closeBrowserDrawer]);

  const openBrowserDrawer = useCallback((
    event: React.MouseEvent<HTMLAnchorElement>,
    title: string,
    url: string
  ) => {
    event.preventDefault();
    setBrowser({ open: true, title, url });
  }, []);

  const news = data?.news ?? [];
  const trending = data?.trending ?? [];
  const summaryState = data?.summaryState;
  const browserCloseLabel = locale === 'zh' ? '关闭浏览器' : 'Close browser';
  const summarySwitchDisabled = !aiSummaryAvailabilityChecked || !aiSummaryAvailable || loading;
  const summarySwitchTip = aiSummaryAvailable
    ? t('home.summaryToggleTip')
    : t('home.summaryNeedsAiConfig');

  return (
    <section className={`home-page${active ? ' is-active' : ''}`}>
      <header className="home-header">
        <div>
          <span className="home-title-line">
            <ThunderboltOutlined />
            <h1 className="home-title">{t('home.title')}</h1>
          </span>
          <p className="home-subtitle">{t('home.subtitle')}</p>
        </div>
        <div className="home-header-actions">
          <Button icon={<ReloadOutlined />} loading={loading} onClick={handleDashboardRefresh}>
            {t('home.refresh')}
          </Button>
        </div>
      </header>

      <main className="home-body">
        {error && <Alert className="home-alert" type="warning" showIcon message={error} />}

        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <>
            <section className="home-summary-panel">
              <Space className="home-summary-stack" orientation="vertical" size={8}>
                <div className="home-summary-header">
                  <span className="home-strong-text">
                    <CalendarOutlined /> {t('home.summary')}
                  </span>
                  <span className="home-summary-actions">
                    {summaryState?.generated && <Tag color="success">{t('home.summaryAiGenerated')}</Tag>}
                    {summaryState?.enabled && !summaryState.generated && summaryState.error && (
                      <Tag color="warning">{t('home.summaryAiFailed')}</Tag>
                    )}
                    <Tooltip title={summarySwitchTip}>
                      <span className="home-summary-switch-wrap">
                        <Switch
                          checked={aiSummaryEnabled && aiSummaryAvailable}
                          checkedChildren={t('home.summaryOn')}
                          disabled={summarySwitchDisabled}
                          loading={loading && aiSummaryEnabled}
                          onChange={handleAiSummaryToggle}
                          size="small"
                          unCheckedChildren={t('home.summaryOff')}
                        />
                      </span>
                    </Tooltip>
                  </span>
                </div>
                <p className="home-summary-text">
                  {data?.summary || t('home.summaryEmpty')}
                </p>
                {!aiSummaryAvailable && (
                  <p className="home-summary-hint">{t('home.summaryNeedsAiConfig')}</p>
                )}
              </Space>
            </section>

            <div className="home-dashboard-grid">
              <section className="home-panel">
                <div className="home-panel-header">
                  <span className="home-strong-text">
                    <FireOutlined /> {t('home.news')}
                  </span>
                  <Tag>{t('home.today')}</Tag>
                </div>
                {news.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('home.newsEmpty')} />
                ) : (
                  <div className="home-list">
                    {news.map((item: HomeNewsItem, index) => (
                      <a
                        className="home-news-link"
                        key={`${item.url}-${index}`}
                        href={item.url}
                        onClick={(event) => openBrowserDrawer(event, item.title, item.url)}
                      >
                        <span className="home-rank">{index + 1}</span>
                        <span className="home-item-main">
                          <span className="home-item-title" title={item.title}>
                            {item.title}
                          </span>
                          <span className="home-item-meta">
                            <Tag icon={<GlobalOutlined />}>{item.source}</Tag>
                            {item.publishedAt && (
                              <span className="home-muted-text">
                                {formatDate(item.publishedAt, locale)}
                              </span>
                            )}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <section className="home-panel">
                <div className="home-panel-header">
                  <span className="home-strong-text">
                    <GithubOutlined /> {t('home.githubTrending')}
                  </span>
                  <Segmented
                    value={period}
                    options={periodOptions}
                    onChange={(value) => setPeriod(value as TrendPeriod)}
                  />
                </div>
                {trending.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('home.trendingEmpty')} />
                ) : (
                  <div className="home-list">
                    {trending.map((item: GithubTrendingItem, index) => (
                      <a
                        className="home-news-link home-repo-link"
                        key={item.url}
                        href={item.url}
                        onClick={(event) => openBrowserDrawer(event, item.name, item.url)}
                      >
                        <span className="home-repo-rank">#{index + 1}</span>
                        <span className="home-repo-header">
                          <span className="home-repo-title-wrap">
                            <span className="home-repo-name" title={item.name}>
                              {item.name}
                            </span>
                            {item.language && <Tag>{item.language}</Tag>}
                          </span>
                          <span className="home-repo-metrics">
                            {item.stars && (
                              <span className="home-repo-metric">
                                <StarOutlined />
                                <span>{t('home.stars').replace('{count}', item.stars)}</span>
                              </span>
                            )}
                            {item.periodStars && (
                              <span className="home-repo-metric home-repo-metric--new">
                                <RiseOutlined />
                                <span>{t('home.periodStars').replace('{count}', item.periodStars)}</span>
                              </span>
                            )}
                          </span>
                        </span>
                        {item.description && (
                          <p className="home-repo-description">{item.description}</p>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      <Drawer
        rootClassName="home-browser-drawer"
        title={
          <span className="home-browser-title">
            <span className="home-browser-title-text" title={browser.title}>
              {browser.title}
            </span>
          </span>
        }
        extra={
          <Button
            aria-label={browserCloseLabel}
            className="home-browser-close"
            icon={<CloseOutlined />}
            onClick={handleBrowserCloseClick}
            onPointerDown={handleBrowserClosePointerDown}
            type="text"
          />
        }
        placement="right"
        width="min(920px, 72vw)"
        open={browser.open}
        onClose={closeBrowserDrawer}
        destroyOnHidden
        closable={false}
        mask
        maskClosable
      >
        <div className="home-browser-shell">
          <div className="home-browser-toolbar">
            <span className="home-browser-url" title={browser.url}>
              {browser.url}
            </span>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                (webviewRef.current as HomeWebviewElement | null)?.reload?.();
              }}
            >
              {t('home.refresh')}
            </Button>
          </div>
          <div className="home-browser-frame">
            {browser.url && (
              <webview
                ref={webviewRef}
                className="home-browser-webview"
                src={browser.url}
                partition="persist:cinnatool-home-browser"
              />
            )}
          </div>
        </div>
      </Drawer>
    </section>
  );
};

export default HomePage;
