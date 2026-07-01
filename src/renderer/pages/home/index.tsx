import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Drawer, Empty, Input, Segmented, Skeleton, Tag, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  CopyOutlined,
  ExportOutlined,
  FireOutlined,
  GithubOutlined,
  GlobalOutlined,
  ReloadOutlined,
  RiseOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { GithubTrendingItem, HomeDashboardData, HomeNewsItem } from '@/shared/types/electron';
import './index.css';

type TrendPeriod = 'daily' | 'weekly' | 'yearly';

interface BrowserDrawerState {
  open: boolean;
  title: string;
  url: string;
}

type HomeCache = Map<string, HomeDashboardData>;

interface LoadDataOptions {
  forceRefresh?: boolean;
}

type HomeWebviewElement = HTMLElement & {
  canGoBack?: () => boolean;
  getURL?: () => string;
  goBack?: () => void;
  reload?: () => void;
  stop?: () => void;
};

type HomeWebviewNavigationEvent = Event & {
  url?: string;
};

interface HomePageProps {
  active: boolean;
}

const HOME_DASHBOARD_CACHE_PREFIX = 'cinnatool-home-dashboard:';
const HOME_DASHBOARD_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

function getDashboardCacheKey(locale: 'zh' | 'en', period: TrendPeriod): string {
  return `${locale}:${period}`;
}

function readCachedDashboard(cacheKey: string): HomeDashboardData | null {
  try {
    const raw = localStorage.getItem(`${HOME_DASHBOARD_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HomeDashboardData;
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
    if (Date.now() - parsed.fetchedAt > HOME_DASHBOARD_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedDashboard(cacheKey: string, data: HomeDashboardData): void {
  try {
    localStorage.setItem(`${HOME_DASHBOARD_CACHE_PREFIX}${cacheKey}`, JSON.stringify(data));
  } catch {
    // Dashboard cache is only a startup accelerator.
  }
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

function normalizeBrowserUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const HomePage: React.FC<HomePageProps> = ({ active }) => {
  const { message } = AntdApp.useApp();
  const { t, locale } = useTranslation();
  const [period, setPeriod] = useState<TrendPeriod>('daily');
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [browser, setBrowser] = useState<BrowserDrawerState>({
    open: false,
    title: '',
    url: '',
  });
  const [browserAddress, setBrowserAddress] = useState('');
  const [browserCanGoBack, setBrowserCanGoBack] = useState(false);
  const dashboardCacheRef = useRef<HomeCache>(new Map());
  const latestLoadIdRef = useRef(0);
  const webviewRef = useRef<HTMLElement | null>(null);
  const webviewCleanupRef = useRef<(() => void) | null>(null);
  const browserAddressFocusedRef = useRef(false);

  const periodOptions = useMemo(
    () => [
      { label: t('home.period.daily'), value: 'daily' },
      { label: t('home.period.weekly'), value: 'weekly' },
      { label: t('home.period.yearly'), value: 'yearly' },
    ],
    [locale]
  );

  const loadData = useCallback(async ({ forceRefresh = false }: LoadDataOptions = {}) => {
    const cacheKey = getDashboardCacheKey(locale, period);
    const cachedData = dashboardCacheRef.current.get(cacheKey) ?? readCachedDashboard(cacheKey);

    if (!forceRefresh && cachedData) {
      dashboardCacheRef.current.set(cacheKey, cachedData);
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
          summary: '',
          summaryState: {
            enabled: false,
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

      const nextData = await window.electronAPI.fetchHomeDashboard(locale, period, { forceRefresh });
      if (loadId !== latestLoadIdRef.current) return;

      dashboardCacheRef.current.set(cacheKey, nextData);
      writeCachedDashboard(cacheKey, nextData);
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
  }, [locale, period, t]);

  useEffect(() => {
    if (!active) return;

    void loadData();
  }, [active, loadData]);

  const handleDashboardRefresh = async () => {
    await loadData({ forceRefresh: true });
  };

  const closeBrowserDrawer = useCallback(() => {
    const webview = webviewRef.current as HomeWebviewElement | null;
    webview?.stop?.();
    webview?.setAttribute('src', 'about:blank');
    setBrowser({ open: false, title: '', url: '' });
    setBrowserAddress('');
    setBrowserCanGoBack(false);
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
    setBrowserAddress(url);
    setBrowserCanGoBack(false);
  }, []);

  const getBrowserAddress = useCallback(() => {
    return normalizeBrowserUrl(browserAddress || browser.url);
  }, [browser.url, browserAddress]);

  const handleBrowserAddressSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUrl = getBrowserAddress();
    if (!nextUrl) return;
    browserAddressFocusedRef.current = false;
    event.currentTarget.querySelector('input')?.blur();
    setBrowser((current) => ({
      ...current,
      title: current.title || nextUrl,
      url: nextUrl,
    }));
    setBrowserAddress(nextUrl);
  }, [getBrowserAddress]);

  const handleCopyBrowserAddress = useCallback(async () => {
    const nextUrl = getBrowserAddress();
    if (!nextUrl) return;

    try {
      if (window.electronAPI?.writeClipboardText) {
        await window.electronAPI.writeClipboardText(nextUrl);
      } else {
        await navigator.clipboard.writeText(nextUrl);
      }
      message.success(t('home.browserCopied'));
    } catch {
      message.warning(t('home.browserCopyFailed'));
    }
  }, [getBrowserAddress, message, t]);

  const handleOpenExternalBrowser = useCallback(async () => {
    const nextUrl = getBrowserAddress();
    if (!nextUrl) return;

    try {
      if (window.electronAPI?.openExternalUrl) {
        await window.electronAPI.openExternalUrl(nextUrl);
      } else {
        window.open(nextUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      message.warning(t('home.browserOpenExternalFailed'));
    }
  }, [getBrowserAddress, message, t]);

  const updateBrowserNavigationState = useCallback((
    webview: HomeWebviewElement | null = webviewRef.current as HomeWebviewElement | null,
    event?: Event
  ) => {
    const eventUrl = (event as HomeWebviewNavigationEvent | undefined)?.url;
    const nextUrl = eventUrl || webview?.getURL?.() || '';

    try {
      setBrowserCanGoBack(Boolean(webview?.canGoBack?.()));
    } catch {
      setBrowserCanGoBack(false);
    }

    if (nextUrl) {
      if (!browserAddressFocusedRef.current) {
        setBrowserAddress(nextUrl);
      }
    }
  }, []);

  const handleBrowserBack = useCallback(() => {
    const webview = webviewRef.current as HomeWebviewElement | null;
    if (!webview?.canGoBack?.()) {
      setBrowserCanGoBack(false);
      return;
    }
    webview.goBack?.();
    window.setTimeout(() => updateBrowserNavigationState(webview), 100);
    window.setTimeout(() => updateBrowserNavigationState(webview), 300);
  }, [updateBrowserNavigationState]);

  const bindBrowserWebview = useCallback((node: HTMLElement | null) => {
    webviewCleanupRef.current?.();
    webviewCleanupRef.current = null;
    webviewRef.current = node;

    if (!node) {
      setBrowserCanGoBack(false);
      return;
    }

    const webview = node as HomeWebviewElement;

    const handleNavigationEvent = (event: Event) => {
      updateBrowserNavigationState(webview, event);
      window.setTimeout(() => updateBrowserNavigationState(webview, event), 100);
      window.setTimeout(() => updateBrowserNavigationState(webview, event), 300);
    };

    const eventNames = [
      'dom-ready',
      'did-start-navigation',
      'did-redirect-navigation',
      'did-navigate',
      'did-navigate-in-page',
      'did-finish-load',
      'page-title-updated',
    ];

    eventNames.forEach((eventName) => {
      webview.addEventListener(eventName, handleNavigationEvent);
    });
    const navigationPollTimer = window.setInterval(() => {
      updateBrowserNavigationState(webview);
    }, 500);
    window.setTimeout(() => updateBrowserNavigationState(webview), 0);
    window.setTimeout(() => updateBrowserNavigationState(webview), 300);

    webviewCleanupRef.current = () => {
      window.clearInterval(navigationPollTimer);
      eventNames.forEach((eventName) => {
        webview.removeEventListener(eventName, handleNavigationEvent);
      });
    };
  }, [updateBrowserNavigationState]);

  useEffect(() => {
    return () => {
      webviewCleanupRef.current?.();
      webviewCleanupRef.current = null;
    };
  }, []);

  const news = data?.news ?? [];
  const trending = data?.trending ?? [];
  const browserCloseLabel = locale === 'zh' ? '关闭浏览器' : 'Close browser';

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
            <Tooltip title={t('home.browserBack')}>
              <Button
                aria-label={t('home.browserBack')}
                disabled={!browserCanGoBack}
                icon={<ArrowLeftOutlined />}
                onClick={handleBrowserBack}
              />
            </Tooltip>
            <form className="home-browser-address-form" onSubmit={handleBrowserAddressSubmit}>
              <Input
                className="home-browser-address-input"
                value={browserAddress}
                title={browserAddress}
                aria-label={t('home.browserAddress')}
                spellCheck={false}
                onBlur={() => {
                  browserAddressFocusedRef.current = false;
                  updateBrowserNavigationState();
                }}
                onChange={(event) => setBrowserAddress(event.target.value)}
                onFocus={() => {
                  browserAddressFocusedRef.current = true;
                }}
              />
            </form>
            <Tooltip title={t('home.browserCopyUrl')}>
              <Button
                aria-label={t('home.browserCopyUrl')}
                icon={<CopyOutlined />}
                onClick={handleCopyBrowserAddress}
              />
            </Tooltip>
            <Tooltip title={t('home.browserOpenExternal')}>
              <Button
                aria-label={t('home.browserOpenExternal')}
                icon={<ExportOutlined />}
                onClick={handleOpenExternalBrowser}
              />
            </Tooltip>
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
                ref={bindBrowserWebview}
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
