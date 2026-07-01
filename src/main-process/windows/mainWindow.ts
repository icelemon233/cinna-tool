import { app, BrowserWindow, ipcMain, screen, type Rectangle } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { getAppIconPath } from '../utils/assets';
import { loadWindowState, saveWindowState } from '../utils/jsonStore';
import type { WindowState } from '../types';

const DEFAULT_WINDOW_STATE: WindowState = { width: 800, height: 600 };
const MIN_VISIBLE_PIXELS = 80;
const STARTUP_REVEAL_FALLBACK_MS = 10_000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getVisiblePixels(bounds: Rectangle, workArea: Rectangle): number {
  const left = Math.max(bounds.x, workArea.x);
  const top = Math.max(bounds.y, workArea.y);
  const right = Math.min(bounds.x + bounds.width, workArea.x + workArea.width);
  const bottom = Math.min(bounds.y + bounds.height, workArea.y + workArea.height);

  if (right <= left || bottom <= top) {
    return 0;
  }

  return (right - left) * (bottom - top);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function fitBoundsToDisplay(bounds: Rectangle, workArea: Rectangle): Rectangle {
  const width = Math.min(Math.max(bounds.width, 400), workArea.width);
  const height = Math.min(Math.max(bounds.height, 300), workArea.height);

  return {
    width,
    height,
    x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - width),
    y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - height),
  };
}

function centerOnPrimaryDisplay(width: number, height: number): Rectangle {
  const { workArea } = screen.getPrimaryDisplay();
  const fittedWidth = Math.min(Math.max(width, 400), workArea.width);
  const fittedHeight = Math.min(Math.max(height, 300), workArea.height);

  return {
    width: fittedWidth,
    height: fittedHeight,
    x: Math.round(workArea.x + (workArea.width - fittedWidth) / 2),
    y: Math.round(workArea.y + (workArea.height - fittedHeight) / 2),
  };
}

function normalizeWindowState(state: WindowState): Rectangle {
  const width = isFiniteNumber(state.width) ? state.width : DEFAULT_WINDOW_STATE.width;
  const height = isFiniteNumber(state.height) ? state.height : DEFAULT_WINDOW_STATE.height;

  if (!isFiniteNumber(state.x) || !isFiniteNumber(state.y)) {
    return centerOnPrimaryDisplay(width, height);
  }

  const bounds = { x: state.x, y: state.y, width, height };
  const matchingDisplay = screen
    .getAllDisplays()
    .find(({ workArea }) => getVisiblePixels(bounds, workArea) >= MIN_VISIBLE_PIXELS);

  if (!matchingDisplay) {
    return centerOnPrimaryDisplay(width, height);
  }

  return fitBoundsToDisplay(bounds, matchingDisplay.workArea);
}

function ensureWindowIsVisible(win: BrowserWindow): void {
  const bounds = win.getBounds();
  const matchingDisplay = screen
    .getAllDisplays()
    .find(({ workArea }) => getVisiblePixels(bounds, workArea) >= MIN_VISIBLE_PIXELS);

  if (matchingDisplay) {
    win.setBounds(fitBoundsToDisplay(bounds, matchingDisplay.workArea));
    return;
  }

  win.setBounds(centerOnPrimaryDisplay(bounds.width, bounds.height));
}

export function revealMainWindow(win: BrowserWindow, options: { inactive?: boolean } = {}): void {
  if (win.isDestroyed()) return;

  ensureWindowIsVisible(win);
  win.setSkipTaskbar(false);
  win.setIgnoreMouseEvents(false);
  win.setOpacity(1);

  if (win.isMinimized()) {
    win.restore();
  }

  if (options.inactive) {
    win.showInactive();
    return;
  }

  win.show();
  win.focus();
  win.moveTop();

  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
}

export function createMainWindow(
  isQuitting: () => boolean,
  onRevealed: () => void = () => {}
): BrowserWindow {
  const startupStartedAt = Date.now();
  const shouldLogStartup = process.env.CINNATOOL_STARTUP_LOG === '1';
  const logStartup = (label: string) => {
    if (!shouldLogStartup) return;
    console.log(`[main-window +${Date.now() - startupStartedAt}ms] ${label}`);
  };
  const savedState = normalizeWindowState(loadWindowState());
  const rendererFilePath = path.join(__dirname, '../../../dist-renderer/index.html');
  const rendererFileUrl = pathToFileURL(rendererFilePath).toString();
  const shouldStartInBackground =
    process.env.VITE_DEV_SERVER_URL && process.env.CINNATOOL_DEV_BACKGROUND_START === '1';
  const isAllowedRendererNavigation = (targetUrl: string) => {
    if (!process.env.VITE_DEV_SERVER_URL) {
      return targetUrl === rendererFileUrl;
    }

    try {
      return new URL(targetUrl).origin === new URL(process.env.VITE_DEV_SERVER_URL).origin;
    } catch {
      return false;
    }
  };
  const chromeOptions =
    process.platform === 'darwin'
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: 18, y: 18 },
        }
      : {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: true,
        };

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 400,
    minHeight: 300,
    show: false,
    title: 'CinnaTool',
    icon: getAppIconPath(),
    backgroundColor: '#fbfbfa',
    ...chromeOptions,
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });
  logStartup('created BrowserWindow');
  let didReveal = false;
  let didWarmForRendering = false;
  let revealFallbackTimer: ReturnType<typeof setTimeout>;
  const warmForRendering = () => {
    if (didReveal || didWarmForRendering || shouldStartInBackground || win.isDestroyed()) return;

    didWarmForRendering = true;
    ensureWindowIsVisible(win);
    win.setOpacity(0);
    win.setIgnoreMouseEvents(true);
    win.showInactive();
    logStartup('warm transparent window');
  };
  const revealOnce = (inactive = false) => {
    if (didReveal) return;
    didReveal = true;
    clearTimeout(revealFallbackTimer);
    logStartup('reveal window');
    revealMainWindow(win, { inactive });
    onRevealed();
  };
  revealFallbackTimer = setTimeout(() => {
    logStartup('reveal fallback');
    revealOnce(Boolean(shouldStartInBackground));
  }, STARTUP_REVEAL_FALLBACK_MS);
  revealFallbackTimer.unref?.();

  const handleShellReady = (event: Electron.IpcMainEvent) => {
    if (event.sender.id !== win.webContents.id) return;
    logStartup('renderer shell ready');
    revealOnce(Boolean(shouldStartInBackground));
  };

  ipcMain.on('app:shell-ready', handleShellReady);
  win.on('closed', () => {
    ipcMain.removeListener('app:shell-ready', handleShellReady);
  });

  const persistBounds = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    saveWindowState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  };

  win.on('resize', persistBounds);
  win.on('move', persistBounds);

  win.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedRendererNavigation(targetUrl)) {
      event.preventDefault();
    }
  });

  if (process.platform === 'darwin') {
    win.on('close', (event) => {
      if (!isQuitting()) {
        event.preventDefault();
        win.hide();
      }
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    logStartup('load dev url');
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (!shouldStartInBackground) {
      win.webContents.openDevTools();
    }
  } else {
    logStartup('load renderer file');
    win.loadFile(rendererFilePath);
    warmForRendering();
  }

  win.webContents.once('did-finish-load', () => {
    logStartup('did-finish-load');
  });

  win.once('ready-to-show', () => {
    logStartup('ready-to-show');
    warmForRendering();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `Failed to load renderer (${errorCode}) ${errorDescription}: ${validatedURL}`
    );
    revealOnce(false);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`Renderer process gone: ${details.reason}`);
  });

  return win;
}
