import React, { Suspense, lazy, useEffect, useState } from 'react';
import { App as AntdApp, ConfigProvider, Menu, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import {
  CalendarOutlined,
  CheckSquareOutlined,
  CopyOutlined,
  FileSearchOutlined,
  HomeOutlined,
  MessageOutlined,
  PictureOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import TopBar from '@/shared/components/top-bar/TopBar';
import QuickReader from '@/pages/quick-reader';
import ImageViewer from '@/pages/image-viewer';
import HomePage from '@/pages/home';
import type { SectionId } from '@/pages/settings/types';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useTranslation } from '@/shared/i18n';
import { getAntdTheme } from './theme';
import './index.css';

type Page = 'home' | 'todo' | 'schedule' | 'clipboard' | 'chat' | 'reader' | 'search' | 'images' | 'settings';

const ChatPage = lazy(() => import('@/pages/chat'));
const ClipboardPage = lazy(() => import('@/pages/clipboard'));
const QuickSearch = lazy(() => import('@/pages/quick-search'));
const SchedulePage = lazy(() => import('@/pages/schedule'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const TodoPage = lazy(() => import('@/pages/todo'));
const isClipboardFloatingWindow =
  new URLSearchParams(window.location.search).get('window') === 'clipboard-floating';

function toCssUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return `url("${url.replace(/"/g, '%22')}")`;
}

function PageFallback() {
  return (
    <div className="app-page-loading">
      <Spin />
    </div>
  );
}

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [settingsSection, setSettingsSection] = useState<SectionId>('appearance');
  const [mountedPages, setMountedPages] = useState<Set<Page>>(() => new Set(['home']));
  const {
    theme,
    language,
    wallpaperFile,
    wallpaperOpacity,
    setWallpaperFile,
    dynamicWallpaperFile,
    setDynamicWallpaperFile,
  } = useSettingsStore();
  const { t } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    window.electronAPI?.setAppLocale(language).catch(() => {});
  }, [language]);

  useEffect(() => {
    return window.electronAPI?.onShowClipboardPage?.(() => {
      setPage('clipboard');
    });
  }, []);

  useEffect(() => {
    setMountedPages((current) => {
      if (current.has(page)) return current;
      const next = new Set(current);
      next.add(page);
      return next;
    });
  }, [page]);

  useEffect(() => {
    if (!wallpaperFile?.path || !window.electronAPI?.resolveWallpaperFile) return undefined;

    let alive = true;
    window.electronAPI.resolveWallpaperFile(wallpaperFile.path, 'static').then((file) => {
      if (!alive) return;
      if (!file) {
        setWallpaperFile(null);
        return;
      }
      if (
        file.url !== wallpaperFile.url ||
        file.name !== wallpaperFile.name ||
        file.mtime !== wallpaperFile.mtime
      ) {
        setWallpaperFile(file);
      }
    }).catch(() => {
      if (alive) setWallpaperFile(null);
    });

    return () => {
      alive = false;
    };
  }, [setWallpaperFile, wallpaperFile?.path]);

  useEffect(() => {
    if (!dynamicWallpaperFile?.path || !window.electronAPI?.resolveWallpaperFile) return undefined;

    let alive = true;
    window.electronAPI.resolveWallpaperFile(dynamicWallpaperFile.path, 'dynamic').then((file) => {
      if (!alive) return;
      if (!file) {
        setDynamicWallpaperFile(null);
        return;
      }
      if (
        file.url !== dynamicWallpaperFile.url ||
        file.name !== dynamicWallpaperFile.name ||
        file.mtime !== dynamicWallpaperFile.mtime ||
        file.mediaType !== dynamicWallpaperFile.mediaType
      ) {
        setDynamicWallpaperFile(file);
      }
    }).catch(() => {
      if (alive) setDynamicWallpaperFile(null);
    });

    return () => {
      alive = false;
    };
  }, [dynamicWallpaperFile?.path, setDynamicWallpaperFile]);

  const dynamicWallpaperImage = toCssUrl(dynamicWallpaperFile?.url);
  const wallpaperImage = toCssUrl(wallpaperFile?.url);
  const isPageMounted = (target: Page) => mountedPages.has(target);
  const openSettings = (section?: SectionId) => {
    if (section) {
      setSettingsSection(section);
    }
    setPage('settings');
  };

  if (isClipboardFloatingWindow) {
    return (
      <ConfigProvider
        locale={language === 'zh' ? zhCN : enUS}
        theme={getAntdTheme(theme)}
      >
        <AntdApp>
          <Suspense fallback={<PageFallback />}>
            <ClipboardPage mode="floating" />
          </Suspense>
        </AntdApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      locale={language === 'zh' ? zhCN : enUS}
      theme={getAntdTheme(theme)}
    >
      <AntdApp>
        <div
          className="app-shell"
          data-theme={theme}
          data-has-wallpaper={wallpaperFile ? 'true' : 'false'}
          data-has-dynamic-wallpaper={dynamicWallpaperFile ? 'true' : 'false'}
          style={{ '--wallpaper-opacity': wallpaperOpacity } as React.CSSProperties}
        >
          <aside className="app-sidebar">
            <Menu
              className="app-nav-menu"
              mode="inline"
              selectedKeys={[page]}
              onClick={({ key }) => setPage(key as Page)}
              items={[
                {
                  key: 'home',
                  icon: <HomeOutlined />,
                  label: t('nav.home'),
                },
                {
                  key: 'todo',
                  icon: <CheckSquareOutlined />,
                  label: t('nav.todo'),
                },
                {
                  key: 'schedule',
                  icon: <CalendarOutlined />,
                  label: t('nav.schedule'),
                },
                {
                  key: 'clipboard',
                  icon: <CopyOutlined />,
                  label: t('nav.clipboard'),
                },
                {
                  key: 'chat',
                  icon: <MessageOutlined />,
                  label: t('nav.chat'),
                },
                {
                  key: 'reader',
                  icon: <FileSearchOutlined />,
                  label: t('nav.reader'),
                },
                {
                  key: 'search',
                  icon: <SearchOutlined />,
                  label: t('nav.search'),
                },
                {
                  key: 'images',
                  icon: <PictureOutlined />,
                  label: t('nav.images'),
                },
              ]}
            />
            <div className="app-sidebar-bottom">
              <button
                className={`app-sidebar-action${page === 'settings' ? ' is-active' : ''}`}
                onClick={() => openSettings()}
                aria-label={t('nav.settings')}
              >
                <SettingOutlined />
                <span className="sidebar-action-label">{t('nav.settings')}</span>
              </button>
            </div>
          </aside>

          <section className="app-main-panel">
            {wallpaperFile?.url && (
              <div
                className="app-wallpaper-layer app-wallpaper-layer--image"
                style={{ backgroundImage: wallpaperImage }}
              />
            )}
            {dynamicWallpaperFile?.mediaType === 'video' && (
              <video
                className="app-wallpaper-layer app-wallpaper-video"
                key={dynamicWallpaperFile.url}
                src={dynamicWallpaperFile.url}
                autoPlay
                loop
                muted
                playsInline
              />
            )}
            {dynamicWallpaperFile?.mediaType === 'image' && (
              <div
                className="app-wallpaper-layer app-wallpaper-layer--image"
                style={{ backgroundImage: dynamicWallpaperImage }}
              />
            )}
            <TopBar
              onOpenSettings={() => openSettings()}
            />
            <main className="app-content-area">
              <div className="app-page-wrapper">
                {isPageMounted('home') && <HomePage active={page === 'home'} />}
                <Suspense fallback={<PageFallback />}>
                  <div className={`app-page-slot${page === 'todo' ? ' is-active' : ''}`}>
                    {isPageMounted('todo') && <TodoPage />}
                  </div>
                  {isPageMounted('schedule') && <SchedulePage active={page === 'schedule'} />}
                  <div className={`app-page-slot${page === 'clipboard' ? ' is-active' : ''}`}>
                    {isPageMounted('clipboard') && <ClipboardPage mode="main" />}
                  </div>
                  <div className={`app-page-slot${page === 'chat' ? ' is-active' : ''}`}>
                    {isPageMounted('chat') && <ChatPage />}
                  </div>
                  <QuickReader
                    active={page === 'reader'}
                    onActivate={() => setPage('reader')}
                  />
                  {isPageMounted('search') && <QuickSearch active={page === 'search'} />}
                </Suspense>
                <ImageViewer active={page === 'images'} onActivate={() => setPage('images')} />
                <div className={`app-page-slot${page === 'settings' ? ' is-active' : ''}`}>
                  <Suspense fallback={<PageFallback />}>
                    {isPageMounted('settings') && (
                      <SettingsPage
                        activeSection={settingsSection}
                        onSectionChange={setSettingsSection}
                      />
                    )}
                  </Suspense>
                </div>
              </div>
            </main>
          </section>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
