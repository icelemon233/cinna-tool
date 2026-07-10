import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App as AntdApp, Button, ConfigProvider, Input, Menu, Modal, Spin, type MenuProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CopyOutlined,
  DiffOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HomeOutlined,
  MessageOutlined,
  PictureOutlined,
  SearchOutlined,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import TopBar from '@/shared/components/top-bar/TopBar';
import HomePage from '@/pages/home';
import type { SectionId } from '@/pages/settings/types';
import { isQuickSearchDropFile } from '@/pages/quick-search/constants';
import type { QuickSearchDropRequest } from '@/pages/quick-search/types';
import type { ReaderState } from '@/pages/quick-reader/types';
import { useSettingsStore } from '@/shared/store/settingsStore';
import { useClipboardStore } from '@/shared/store/clipboardStore';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';
import { getAntdTheme } from './theme';
import './index.css';

type Page = 'home' | 'todo' | 'schedule' | 'clipboard' | 'translation' | 'chat' | 'documentGen' | 'reader' | 'search' | 'codeDiff' | 'logAnalysis' | 'images' | 'settings';
type QuickAction = 'create-todo' | 'create-schedule' | 'add-clipboard' | 'toggle-floating';

const ChatPage = lazy(() => import('@/pages/chat'));
const CodeDiffPage = lazy(() => import('@/pages/code-diff'));
const ClipboardPage = lazy(() => import('@/pages/clipboard'));
const DocumentGeneratorPage = lazy(() => import('@/pages/document-generator'));
const FloatingToolsPage = lazy(() => import('@/pages/floating-tools'));
const ImageViewer = lazy(() => import('@/pages/image-viewer'));
const LogAnalysisPage = lazy(() => import('@/pages/log-analysis'));
const QuickReader = lazy(() => import('@/pages/quick-reader'));
const QuickSearch = lazy(() => import('@/pages/quick-search'));
const SchedulePage = lazy(() => import('@/pages/schedule'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const TodoPage = lazy(() => import('@/pages/todo'));
const TranslationPage = lazy(() => import('@/pages/translation'));
const appWindowMode = new URLSearchParams(window.location.search).get('window');
const isClipboardFloatingWindow = appWindowMode === 'clipboard-floating';
const isTranslationQuickWindow = appWindowMode === 'translation-quick';
const SETTINGS_STORAGE_KEY = 'cinnatool-settings';

function isLogAnalysisDropFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.log');
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, [contenteditable="true"], .ant-input'));
}

function getFileExtension(file: File): string {
  const name = file.name.toLowerCase();
  if (name === 'dockerfile') return '.dockerfile';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex === -1 ? '' : name.slice(dotIndex);
}

function isSupportedReaderFile(file: File): boolean {
  const textExtensions = new Set([
    '.txt',
    '.text',
    '.log',
    '.out',
    '.err',
    '.csv',
    '.tsv',
    '.json',
    '.md',
    '.markdown',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.htm',
    '.xml',
    '.yaml',
    '.yml',
    '.toml',
    '.ini',
    '.conf',
    '.config',
    '.env',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.c',
    '.cc',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.php',
    '.rb',
    '.swift',
    '.kt',
    '.kts',
    '.sql',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.bat',
    '.dockerfile',
  ]);

  return file.type.startsWith('text/') || textExtensions.has(getFileExtension(file));
}

function isJsonFileName(file: File): boolean {
  return getFileExtension(file) === '.json';
}

function toCssUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return `url("${url.replace(/"/g, '%22')}")`;
}

function normalizeClipboardFloatingOpacity(value: unknown, fallback = 0.9): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0.35, value))
    : fallback;
}

function getStoredClipboardFloatingOpacity(rawSettings: string | null, fallback = 0.9): number {
  if (!rawSettings) return fallback;

  try {
    const parsed = JSON.parse(rawSettings) as { state?: { clipboardFloatingOpacity?: unknown } };
    return normalizeClipboardFloatingOpacity(parsed.state?.clipboardFloatingOpacity, fallback);
  } catch {
    return fallback;
  }
}

function PageFallback() {
  return (
    <div className="app-page-loading">
      <Spin />
    </div>
  );
}

function navLabel(label: string, count = 0) {
  const countText = count > 99 ? '99+' : String(count);

  return (
    <span className="app-nav-label">
      <span className="app-nav-label-text">{label}</span>
      {count > 0 && (
        <span className="app-nav-label-count">{countText}</span>
      )}
    </span>
  );
}

function getMsUntilNextLocalDay(): number {
  const nextDay = new Date();
  nextDay.setHours(24, 0, 1, 0);
  return Math.max(nextDay.getTime() - Date.now(), 1000);
}

interface QuickReaderOpenRequest {
  id: number;
  reader: ReaderState;
}

const App: React.FC = () => {
  const initialPage: Page = useSettingsStore.getState().hideHomePage ? 'todo' : 'home';
  const [page, setPage] = useState<Page>(initialPage);
  const [settingsSection, setSettingsSection] = useState<SectionId>('appearance');
  const [mountedPages, setMountedPages] = useState<Set<Page>>(() => new Set([initialPage]));
  const [quickSearchDrop, setQuickSearchDrop] = useState<QuickSearchDropRequest | null>(null);
  const [quickReaderOpen, setQuickReaderOpen] = useState<QuickReaderOpenRequest | null>(null);
  const [logAnalysisDrop, setLogAnalysisDrop] = useState<QuickSearchDropRequest | null>(null);
  const [pendingTextDrop, setPendingTextDrop] = useState<QuickSearchDropRequest | null>(null);
  const [quickScheduleRequestId, setQuickScheduleRequestId] = useState<number | null>(null);
  const [quickScheduleDismissKey, setQuickScheduleDismissKey] = useState(0);
  const [quickTodoOpen, setQuickTodoOpen] = useState(false);
  const [quickTodoText, setQuickTodoText] = useState('');
  const [quickClipboardOpen, setQuickClipboardOpen] = useState(false);
  const [quickClipboardText, setQuickClipboardText] = useState('');
  const [quickClipboardLoading, setQuickClipboardLoading] = useState(false);
  const dropRequestIdRef = useRef(0);
  const {
    theme,
    language,
    hideHomePage,
    wallpaperFile,
    wallpaperOpacity,
    clipboardFloatingOpacity,
    setWallpaperFile,
    dynamicWallpaperFile,
    setDynamicWallpaperFile,
  } = useSettingsStore();
  const pendingTodoCount = useTodoStore((state) => (
    Array.isArray(state.todos) ? state.todos.filter((todo) => !todo.completed).length : 0
  ));
  const refreshMyDay = useTodoStore((state) => state.refreshMyDay);
  const setTodoSearchQuery = useTodoStore((state) => state.setSearchQuery);
  const addTodo = useTodoStore((state) => state.addTodo);
  const addClipboardItem = useClipboardStore((state) => state.addItem);
  const { t } = useTranslation();

  const openReader = (reader: ReaderState) => {
    setQuickReaderOpen({
      id: dropRequestIdRef.current += 1,
      reader,
    });
    setPage('reader');
  };

  const openReaderFile = async (file: File) => {
    try {
      const { readReaderFile } = await import('@/pages/quick-reader/utils/fileSupport');
      openReader(await readReaderFile(file));
    } catch {
      if (isJsonFileName(file)) {
        return;
      }
    }
  };

  useLayoutEffect(() => {
    if (isClipboardFloatingWindow || isTranslationQuickWindow) return;
    window.electronAPI?.notifyShellReady?.();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const applyOpacity = (opacity: number) => {
      document.documentElement.style.setProperty(
        '--clipboard-floating-opacity',
        String(normalizeClipboardFloatingOpacity(opacity))
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_STORAGE_KEY) return;
      applyOpacity(getStoredClipboardFloatingOpacity(event.newValue, clipboardFloatingOpacity));
    };

    applyOpacity(clipboardFloatingOpacity);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clipboardFloatingOpacity]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    window.electronAPI?.setAppLocale(language).catch(() => {});
  }, [language]);

  useEffect(() => {
    if (hideHomePage && page === 'home') {
      setPage('todo');
    }
  }, [hideHomePage, page]);

  useEffect(() => {
    let timerId: number | undefined;

    const scheduleNextRefresh = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        refreshMyDay();
        scheduleNextRefresh();
      }, getMsUntilNextLocalDay());
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) {
        refreshMyDay();
      }
    };

    refreshMyDay();
    scheduleNextRefresh();
    window.addEventListener('focus', refreshMyDay);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', refreshMyDay);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshMyDay]);

  useEffect(() => {
    return window.electronAPI?.onShowClipboardPage?.(() => {
      setPage('clipboard');
    });
  }, []);

  useEffect(() => {
    return window.electronAPI?.onOpenAISettings?.(() => {
      setSettingsSection('ai');
      setPage('settings');
    });
  }, []);

  useEffect(() => {
    const handleQuickAction = (action: QuickAction) => {
      switch (action) {
        case 'create-todo':
          openQuickTodoAdd();
          break;
        case 'create-schedule':
          closeQuickActionModals();
          setPage('schedule');
          setQuickScheduleRequestId(dropRequestIdRef.current += 1);
          break;
        case 'add-clipboard':
          openQuickClipboardAdd();
          break;
        case 'toggle-floating':
          void window.electronAPI?.toggleClipboardFloatingWindow?.();
          break;
        default:
          break;
      }
    };

    return window.electronAPI?.onQuickAction?.(handleQuickAction);
  }, [addClipboardItem, setTodoSearchQuery]);

  useEffect(() => {
    if (isClipboardFloatingWindow) return undefined;

    const hasDroppedFiles = (event: DragEvent) => (
      Array.from(event.dataTransfer?.types ?? []).includes('Files')
    );

    const handleDragOver = (event: DragEvent) => {
      if (!hasDroppedFiles(event)) return;

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;

      void import('@/pages/quick-reader/utils/fileSupport')
        .then(({ createReaderFromPastedText }) => {
          const reader = createReaderFromPastedText(text, t);
          if (!reader) return;
          event.preventDefault();
          openReader(reader);
        })
        .catch(() => {
          event.preventDefault();
        });
    };

    const handleDrop = (event: DragEvent) => {
      if (!hasDroppedFiles(event)) return;

      if (
        event.target instanceof Element &&
        event.target.closest('[data-log-analysis-drop-zone="true"], [data-code-diff-drop-zone="true"]')
      ) {
        return;
      }

      const files = Array.from(event.dataTransfer?.files ?? []);
      const file = files.find(isQuickSearchDropFile);
      if (!file) {
        const readerFile = files.find(isSupportedReaderFile);
        if (readerFile) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void openReaderFile(readerFile);
          return;
        }

        event.preventDefault();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingTextDrop({
        id: dropRequestIdRef.current += 1,
        file,
      });
    };

    document.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver, true);
    window.addEventListener('drop', handleDrop, true);

    return () => {
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver, true);
      window.removeEventListener('drop', handleDrop, true);
    };
  }, [t]);

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
    closeQuickActionModals();
    if (section) {
      setSettingsSection(section);
    }
    setPage('settings');
  };
  const openPendingTextDropInReader = () => {
    if (!pendingTextDrop) return;

    void openReaderFile(pendingTextDrop.file);
    setPendingTextDrop(null);
  };
  const openPendingTextDropInSearch = () => {
    if (!pendingTextDrop) return;

    setQuickSearchDrop(pendingTextDrop);
    setPendingTextDrop(null);
    setPage('search');
  };
  const openPendingTextDropInLogAnalysis = () => {
    if (!pendingTextDrop || !isLogAnalysisDropFile(pendingTextDrop.file)) return;

    setLogAnalysisDrop(pendingTextDrop);
    setPendingTextDrop(null);
    setPage('logAnalysis');
  };
  const closeQuickActionModals = () => {
    setQuickTodoOpen(false);
    setQuickTodoText('');
    setQuickClipboardOpen(false);
    setQuickClipboardText('');
    setQuickClipboardLoading(false);
    setQuickScheduleRequestId(null);
    setQuickScheduleDismissKey((value) => value + 1);
  };
  const openQuickTodoAdd = () => {
    closeQuickActionModals();
    setTodoSearchQuery('');
    setPage('todo');
    setQuickTodoOpen(true);
    setQuickTodoText('');
  };
  const submitQuickTodoAdd = () => {
    const title = quickTodoText.trim();
    if (!title) return;
    addTodo(title);
    setQuickTodoOpen(false);
    setQuickTodoText('');
  };
  const openQuickClipboardAdd = () => {
    closeQuickActionModals();
    setPage('clipboard');
    setQuickClipboardOpen(true);
    setQuickClipboardText('');
    setQuickClipboardLoading(true);
    const clipboardText = window.electronAPI?.readClipboardText?.() ?? Promise.resolve('');
    void clipboardText
      .then((text) => {
        setQuickClipboardText(text);
      })
      .catch(() => {
        setQuickClipboardText('');
      })
      .finally(() => {
        setQuickClipboardLoading(false);
      });
  };
  const submitQuickClipboardAdd = () => {
    const id = addClipboardItem(quickClipboardText);
    if (!id) return;
    setQuickClipboardOpen(false);
    setQuickClipboardText('');
  };
  const pendingDropIsLog = pendingTextDrop ? isLogAnalysisDropFile(pendingTextDrop.file) : false;
  const navItems: MenuProps['items'] = [
    ...(!hideHomePage
      ? [{
          key: 'home',
          icon: <HomeOutlined />,
          label: t('nav.home'),
        }]
      : []),
    {
      key: 'todo',
      icon: <CheckSquareOutlined />,
      label: navLabel(t('nav.todo'), pendingTodoCount),
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
      key: 'translation',
      icon: <TranslationOutlined />,
      label: t('nav.translation'),
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: t('nav.chat'),
    },
    {
      key: 'documentGen',
      icon: <FileTextOutlined />,
      label: t('nav.documentGen'),
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
      key: 'codeDiff',
      icon: <DiffOutlined />,
      label: t('nav.codeDiff'),
    },
    {
      key: 'logAnalysis',
      icon: <BarChartOutlined />,
      label: t('nav.logAnalysis'),
    },
    {
      key: 'images',
      icon: <PictureOutlined />,
      label: t('nav.images'),
    },
  ];

  if (isClipboardFloatingWindow) {
    return (
      <ConfigProvider
        locale={language === 'zh' ? zhCN : enUS}
        theme={getAntdTheme(theme)}
      >
        <AntdApp>
          <Suspense fallback={<PageFallback />}>
            <FloatingToolsPage />
          </Suspense>
        </AntdApp>
      </ConfigProvider>
    );
  }

  if (isTranslationQuickWindow) {
    return (
      <ConfigProvider
        locale={language === 'zh' ? zhCN : enUS}
        theme={getAntdTheme(theme)}
      >
        <AntdApp>
          <Suspense fallback={<PageFallback />}>
            <TranslationPage mode="popup" />
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
        <Modal
          centered
          destroyOnHidden
          footer={[
            <Button key="reader" onClick={openPendingTextDropInReader}>
              {t('nav.reader')}
            </Button>,
            <Button key="search" onClick={openPendingTextDropInSearch}>
              {t('nav.search')}
            </Button>,
            pendingDropIsLog && (
              <Button key="logAnalysis" onClick={openPendingTextDropInLogAnalysis}>
                {t('nav.logAnalysis')}
              </Button>
            ),
          ]}
          onCancel={() => setPendingTextDrop(null)}
          open={Boolean(pendingTextDrop)}
          title={t('quickSearch.dropChoiceTitle')}
        >
          <span>
            {t('quickSearch.dropChoiceContent').replace('{name}', pendingTextDrop?.file.name ?? '')}
          </span>
        </Modal>
        <Modal
          centered
          destroyOnHidden
          okButtonProps={{ disabled: !quickTodoText.trim() }}
          okText={t('todo.quickAddOk')}
          onCancel={() => {
            setQuickTodoOpen(false);
            setQuickTodoText('');
          }}
          onOk={submitQuickTodoAdd}
          open={quickTodoOpen}
          title={t('todo.quickAddTitle')}
        >
          <Input
            autoFocus
            onChange={(event) => setQuickTodoText(event.target.value)}
            onPressEnter={submitQuickTodoAdd}
            placeholder={t('todo.quickAddPlaceholder')}
            value={quickTodoText}
          />
        </Modal>
        <Modal
          centered
          destroyOnHidden
          confirmLoading={quickClipboardLoading}
          okButtonProps={{ disabled: !quickClipboardText.trim() }}
          okText={t('clipboard.quickAddOk')}
          onCancel={() => {
            setQuickClipboardOpen(false);
            setQuickClipboardText('');
          }}
          onOk={submitQuickClipboardAdd}
          open={quickClipboardOpen}
          title={t('clipboard.quickAddTitle')}
        >
          <Input.TextArea
            autoFocus
            autoSize={{ minRows: 5, maxRows: 10 }}
            disabled={quickClipboardLoading}
            onChange={(event) => setQuickClipboardText(event.target.value)}
            placeholder={t('clipboard.quickAddPlaceholder')}
            value={quickClipboardText}
          />
        </Modal>
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
              onClick={({ key }) => {
                closeQuickActionModals();
                setPage(key as Page);
              }}
              items={navItems}
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
                <Suspense fallback={<PageFallback />}>
                  {isPageMounted('home') && <HomePage active={page === 'home'} />}
                  <div className={`app-page-slot${page === 'todo' ? ' is-active' : ''}`}>
                    {isPageMounted('todo') && <TodoPage />}
                  </div>
                  {isPageMounted('schedule') && (
                    <SchedulePage
                      active={page === 'schedule'}
                      quickCreateRequestId={quickScheduleRequestId}
                      quickDismissKey={quickScheduleDismissKey}
                      onQuickCreateConsumed={() => setQuickScheduleRequestId(null)}
                    />
                  )}
                  <div className={`app-page-slot${page === 'clipboard' ? ' is-active' : ''}`}>
                    {isPageMounted('clipboard') && <ClipboardPage mode="main" />}
                  </div>
                  <div className={`app-page-slot${page === 'translation' ? ' is-active' : ''}`}>
                    {isPageMounted('translation') && <TranslationPage mode="main" />}
                  </div>
                  <div className={`app-page-slot${page === 'chat' ? ' is-active' : ''}`}>
                    {isPageMounted('chat') && <ChatPage />}
                  </div>
                  <div className={`app-page-slot${page === 'documentGen' ? ' is-active' : ''}`}>
                    {isPageMounted('documentGen') && (
                      <DocumentGeneratorPage active={page === 'documentGen'} />
                    )}
                  </div>
                  {isPageMounted('reader') && (
                    <QuickReader
                      active={page === 'reader'}
                      openRequest={quickReaderOpen}
                      onActivate={() => setPage('reader')}
                    />
                  )}
                  {isPageMounted('search') && (
                    <QuickSearch
                      active={page === 'search'}
                      droppedFile={quickSearchDrop}
                    />
                  )}
                  {isPageMounted('codeDiff') && (
                    <CodeDiffPage active={page === 'codeDiff'} />
                  )}
                  <div className={`app-page-slot${page === 'logAnalysis' ? ' is-active' : ''}`}>
                    {isPageMounted('logAnalysis') && (
                      <LogAnalysisPage
                        active={page === 'logAnalysis'}
                        droppedFile={logAnalysisDrop}
                      />
                    )}
                  </div>
                  {isPageMounted('images') && (
                    <ImageViewer active={page === 'images'} onActivate={() => setPage('images')} />
                  )}
                </Suspense>
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
