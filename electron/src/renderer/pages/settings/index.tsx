import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import { useChatStore, type ChatSettings } from '@/shared/store/chatStore';
import { useSettingsStore, type WallpaperFileInfo } from '@/shared/store/settingsStore';
import { AISettingsSection } from './components/AISettingsSection';
import { AboutSection } from './components/AboutSection';
import { AppearanceSection } from './components/AppearanceSection';
import { DownloadsSection } from './components/DownloadsSection';
import { PerformanceSection } from './components/PerformanceSection';
import { SettingsNav } from './components/SettingsNav';
import type { AppPreferences, SectionId, WallpaperKind, WallpaperPickerResult } from './types';
import './index.css';

const FALLBACK_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const APP_VERSION = '1.0.0';

function getElectronRuntimeVersion(): string {
  const bridgeVersion = window.electronAPI?.version;
  if (bridgeVersion) return bridgeVersion;

  const userAgentVersion = navigator.userAgent.match(/\bElectron\/([^\s]+)/)?.[1];
  return userAgentVersion ?? 'Desktop';
}

function inferLocalWallpaperMediaType(kind: WallpaperKind, file: File): WallpaperFileInfo['mediaType'] {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isVideo = file.type.startsWith('video/') || Boolean(extension && FALLBACK_VIDEO_EXTENSIONS.has(extension));
  return kind === 'dynamic' && isVideo ? 'video' : 'image';
}

interface SettingsPageProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ activeSection, onSectionChange }) => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const fallbackWallpaperUrls = useRef<string[]>([]);
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    wallpaperFile,
    setWallpaperFile,
    dynamicWallpaperFile,
    setDynamicWallpaperFile,
    hideHomePage,
    setHideHomePage,
    wallpaperOpacity,
    setWallpaperOpacity,
    clipboardFloatingOpacity,
    setClipboardFloatingOpacity,
    downloadPath,
    setDownloadPath,
  } = useSettingsStore();
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const {
    loadModels: loadAiModels,
    loadSettings: loadAiSettings,
    models: aiModels,
    settings: aiSettings,
    updateSettings: updateAiSettings,
  } = useChatStore();

  useEffect(() => {
    void (async () => {
      await loadAiModels();
      await loadAiSettings();
    })();
  }, [loadAiModels, loadAiSettings]);

  useEffect(() => {
    if (!window.electronAPI?.storeGet) return;

    window.electronAPI.storeGet('app-preferences').then((stored) => {
      const preferences = stored as Partial<AppPreferences> | null;
      setHardwareAcceleration(preferences?.hardwareAcceleration ?? true);
    }).catch(() => {});
  }, []);

  useEffect(() => () => {
    fallbackWallpaperUrls.current.forEach((url) => URL.revokeObjectURL(url));
    fallbackWallpaperUrls.current = [];
  }, []);

  const appInfo = useMemo(
    () => [
      [t('settings.version'), APP_VERSION],
      ['Electron', getElectronRuntimeVersion()],
      ['Developer', '🧊🍋 icelemon'],
      ['App', 'CinnaTool'],
    ],
    [t]
  );

  const handleHardwareChange = async (checked: boolean) => {
    setHardwareAcceleration(checked);
    await window.electronAPI?.storeSet?.('app-preferences', { hardwareAcceleration: checked });
    message.info(t('settings.restartRequired'));
  };

  const handleDownloadFolder = async () => {
    const folder = await window.electronAPI?.selectDownloadFolder?.();
    if (folder) {
      setDownloadPath(folder);
    }
  };

  const handleSaveAiSettings = (nextSettings: Partial<ChatSettings>) => {
    updateAiSettings(nextSettings);
    message.success(t('settings.aiSaved'));
  };

  const setWallpaperByKind = (kind: WallpaperKind, file: WallpaperFileInfo | null) => {
    if (kind === 'static') {
      setWallpaperFile(file);
      return;
    }

    setDynamicWallpaperFile(file);
  };

  const handleWallpaperFile = async (kind: WallpaperKind): Promise<WallpaperPickerResult> => {
    const selectFile = window.electronAPI?.selectWallpaperFile;
    if (!selectFile) {
      return 'failed';
    }

    try {
      const file = await selectFile(kind);
      if (!file) return 'canceled';

      setWallpaperByKind(kind, file);
      return 'selected';
    } catch {
      message.warning(t('settings.wallpaperNativePickerFailed'));
      return 'failed';
    }
  };

  const handleLocalWallpaperFile = async (kind: WallpaperKind, file: File | undefined) => {
    if (!file) return;

    const filePath = (file as File & { path?: string }).path ?? '';
    if (filePath && window.electronAPI?.resolveWallpaperFile) {
      try {
        const resolvedFile = await window.electronAPI.resolveWallpaperFile(filePath, kind);
        if (resolvedFile) {
          setWallpaperByKind(kind, resolvedFile);
          return;
        }
      } catch {
        // Fall back to an object URL below.
      }
    }

    const url = URL.createObjectURL(file);
    fallbackWallpaperUrls.current.push(url);
    const mediaType = inferLocalWallpaperMediaType(kind, file);
    const nextFile = {
      name: file.name,
      path: filePath,
      url,
      size: file.size,
      mtime: file.lastModified,
      mediaType,
    };

    setWallpaperByKind(kind, nextFile);
  };

  return (
    <section className="settings-page">
      <SettingsNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        t={t}
      />

      <main className="settings-content">
        <div className="settings-content-inner">
          <div className="settings-search-wrap">
            <Input prefix={<SearchOutlined />} placeholder={t('settings.search')} />
          </div>

          {activeSection === 'ai' && (
            <AISettingsSection
              models={aiModels}
              onSave={handleSaveAiSettings}
              settings={aiSettings}
              t={t}
            />
          )}
          {activeSection === 'performance' && (
            <PerformanceSection
              hardwareAcceleration={hardwareAcceleration}
              onHardwareChange={handleHardwareChange}
              t={t}
            />
          )}
          {activeSection === 'appearance' && (
            <AppearanceSection
              dynamicWallpaperFile={dynamicWallpaperFile}
              hideHomePage={hideHomePage}
              language={language}
              nativeWallpaperPickerAvailable={Boolean(window.electronAPI?.selectWallpaperFile)}
              onLocalWallpaperFile={handleLocalWallpaperFile}
              onWallpaperFile={handleWallpaperFile}
              setDynamicWallpaperFile={setDynamicWallpaperFile}
              setHideHomePage={setHideHomePage}
              setLanguage={setLanguage}
              setTheme={setTheme}
              setWallpaperFile={setWallpaperFile}
              setWallpaperOpacity={setWallpaperOpacity}
              setClipboardFloatingOpacity={setClipboardFloatingOpacity}
              t={t}
              theme={theme}
              wallpaperFile={wallpaperFile}
              wallpaperOpacity={wallpaperOpacity}
              clipboardFloatingOpacity={clipboardFloatingOpacity}
            />
          )}
          {activeSection === 'downloads' && (
            <DownloadsSection
              downloadPath={downloadPath}
              onDownloadFolder={handleDownloadFolder}
              t={t}
            />
          )}
          {activeSection === 'about' && (
            <AboutSection appInfo={appInfo} t={t} />
          )}
        </div>
      </main>
    </section>
  );
};

export default SettingsPage;
