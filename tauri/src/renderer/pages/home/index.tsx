import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Empty, Segmented, Skeleton, Tag } from 'antd';
import {
  FireOutlined,
  GithubOutlined,
  GlobalOutlined,
  ReloadOutlined,
  RiseOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import type { GithubTrendingItem, HomeDashboardData, HomeNewsItem } from '@/shared/types/platform';
import './index.css';

type TrendPeriod = 'daily' | 'weekly' | 'yearly';

type HomeCache = Map<string, HomeDashboardData>;

interface LoadDataOptions {
  forceRefresh?: boolean;
}

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
  const dashboardCacheRef = useRef<HomeCache>(new Map());
  const dashboardRequestsRef = useRef<Map<string, Promise<HomeDashboardData>>>(new Map());
  const latestLoadIdRef = useRef(0);

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
      if (!window.cinnaAPI?.fetchHomeDashboard) {
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
        setError(t('home.runtimeUnavailable'));
        return;
      }

      let request = dashboardRequestsRef.current.get(cacheKey);
      if (!request) {
        request = window.cinnaAPI.fetchHomeDashboard(locale, period, { forceRefresh });
        dashboardRequestsRef.current.set(cacheKey, request);
      }

      const nextData = await request;
      if (loadId !== latestLoadIdRef.current) return;

      dashboardCacheRef.current.set(cacheKey, nextData);
      writeCachedDashboard(cacheKey, nextData);
      setData(nextData);
    } catch {
      if (loadId === latestLoadIdRef.current) {
        setError(t('home.error'));
      }
    } finally {
      dashboardRequestsRef.current.delete(cacheKey);
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

  const openUrlWindow = useCallback(async (
    event: React.MouseEvent<HTMLAnchorElement>,
    title: string,
    url: string
  ) => {
    event.preventDefault();
    const nextUrl = normalizeBrowserUrl(url);
    if (!nextUrl) return;

    try {
      if (window.cinnaAPI?.openUrlWindow) {
        await window.cinnaAPI.openUrlWindow(nextUrl, title);
        return;
      }
      if (window.cinnaAPI?.openExternalUrl) {
        await window.cinnaAPI.openExternalUrl(nextUrl);
        return;
      }
      window.open(nextUrl, '_blank', 'noopener,noreferrer');
    } catch {
      try {
        if (window.cinnaAPI?.openExternalUrl) {
          await window.cinnaAPI.openExternalUrl(nextUrl);
          return;
        }
        window.open(nextUrl, '_blank', 'noopener,noreferrer');
      } catch {
        message.warning(t('home.browserOpenExternalFailed'));
      }
    }
  }, [message, t]);

  const news = data?.news ?? [];
  const trending = data?.trending ?? [];

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
                        onClick={(event) => openUrlWindow(event, item.title, item.url)}
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
                        onClick={(event) => openUrlWindow(event, item.name, item.url)}
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

    </section>
  );
};

export default HomePage;
