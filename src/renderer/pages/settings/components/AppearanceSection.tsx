import type React from 'react';
import { useRef } from 'react';
import { Button, Select, Slider, Typography } from 'antd';
import {
  BgColorsOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  PictureOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ThemeType, WallpaperFileInfo } from '@/shared/store/settingsStore';
import { themeOptions } from '../options';
import type { WallpaperKind, WallpaperPickerResult } from '../types';

interface AppearanceSectionProps {
  dynamicWallpaperFile: WallpaperFileInfo | null;
  language: 'zh' | 'en';
  nativeWallpaperPickerAvailable: boolean;
  onLocalWallpaperFile: (kind: WallpaperKind, file: File | undefined) => void | Promise<void>;
  onWallpaperFile: (kind: WallpaperKind) => Promise<WallpaperPickerResult>;
  setDynamicWallpaperFile: (file: WallpaperFileInfo | null) => void;
  setLanguage: (language: 'zh' | 'en') => void;
  setTheme: (theme: ThemeType) => void;
  setWallpaperFile: (file: WallpaperFileInfo | null) => void;
  setWallpaperOpacity: (opacity: number) => void;
  t: (key: string) => string;
  theme: ThemeType;
  wallpaperFile: WallpaperFileInfo | null;
  wallpaperOpacity: number;
}

export function AppearanceSection({
  dynamicWallpaperFile,
  language,
  nativeWallpaperPickerAvailable,
  onLocalWallpaperFile,
  onWallpaperFile,
  setDynamicWallpaperFile,
  setLanguage,
  setTheme,
  setWallpaperFile,
  setWallpaperOpacity,
  t,
  theme,
  wallpaperFile,
  wallpaperOpacity,
}: AppearanceSectionProps) {
  const staticWallpaperInputRef = useRef<HTMLInputElement>(null);
  const dynamicWallpaperInputRef = useRef<HTMLInputElement>(null);
  const languageOptions = [
    {
      value: 'zh' as const,
      label: (
        <span className="settings-select-label">
          <span>🇨🇳</span>
          <span>{t('settings.language.zh')}</span>
        </span>
      ),
    },
    {
      value: 'en' as const,
      label: (
        <span className="settings-select-label">
          <span>🇺🇸</span>
          <span>{t('settings.language.en')}</span>
        </span>
      ),
    },
  ];

  const themeSelectOptions = themeOptions.map((option) => ({
    value: option.id,
    label: (
      <span className="settings-select-label">
        <span className="settings-swatch" style={{ backgroundColor: option.color }} />
        <span>{t(option.labelKey)}</span>
      </span>
    ),
  }));

  const openFallbackPicker = (kind: WallpaperKind) => {
    if (kind === 'static') {
      staticWallpaperInputRef.current?.click();
      return;
    }

    dynamicWallpaperInputRef.current?.click();
  };

  const chooseWallpaper = async (kind: WallpaperKind) => {
    if (nativeWallpaperPickerAvailable) {
      const result = await onWallpaperFile(kind);
      if (result !== 'failed') {
        return;
      }
    }

    openFallbackPicker(kind);
  };

  const handleLocalWallpaper = (
    kind: WallpaperKind,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onLocalWallpaperFile(kind, event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t('settings.appearance')}</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <GlobalOutlined />
              {t('settings.language')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.languageDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control">
            <Select value={language} options={languageOptions} onChange={setLanguage} />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <BgColorsOutlined />
              {t('settings.theme')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.themeDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control">
            <Select<ThemeType>
              value={theme}
              options={themeSelectOptions}
              onChange={setTheme}
            />
          </div>
        </div>

        <WallpaperRow
          file={wallpaperFile}
          icon={<PictureOutlined />}
          noFileLabel={t('settings.noWallpaper')}
          onChoose={() => chooseWallpaper('static')}
          onClear={() => setWallpaperFile(null)}
          title={t('settings.wallpaper')}
          description={t('settings.wallpaperDesc')}
          chooseLabel={t('settings.chooseWallpaper')}
          clearLabel={t('settings.clearWallpaper')}
        />
        <WallpaperRow
          file={dynamicWallpaperFile}
          icon={<PlayCircleOutlined />}
          noFileLabel={t('settings.noDynamicWallpaper')}
          onChoose={() => chooseWallpaper('dynamic')}
          onClear={() => setDynamicWallpaperFile(null)}
          title={t('settings.dynamicWallpaper')}
          description={t('settings.dynamicWallpaperDesc')}
          chooseLabel={t('settings.chooseDynamicWallpaper')}
          clearLabel={t('settings.clearWallpaper')}
        />
        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <PictureOutlined />
              {t('settings.wallpaperOpacity')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.wallpaperOpacityDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control">
            <Slider
              min={15}
              max={100}
              step={5}
              value={Math.round(wallpaperOpacity * 100)}
              onChange={(value) => setWallpaperOpacity(value / 100)}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </div>
        </div>
        <input
          ref={staticWallpaperInputRef}
          className="settings-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.avif,.apng"
          onChange={(event) => handleLocalWallpaper('static', event)}
        />
        <input
          ref={dynamicWallpaperInputRef}
          className="settings-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.avif,.apng,.mp4,.webm,.mov,.m4v"
          onChange={(event) => handleLocalWallpaper('dynamic', event)}
        />
      </div>
    </section>
  );
}

interface WallpaperRowProps {
  chooseLabel: string;
  clearLabel: string;
  description: string;
  file: WallpaperFileInfo | null;
  icon: React.ReactNode;
  noFileLabel: string;
  onChoose: () => void;
  onClear: () => void;
  title: string;
}

function WallpaperRow({
  chooseLabel,
  clearLabel,
  description,
  file,
  icon,
  noFileLabel,
  onChoose,
  onClear,
  title,
}: WallpaperRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row-main">
        <div className="settings-row-title">
          {icon}
          {title}
        </div>
        <Typography.Text className="settings-row-desc" type="secondary">
          {description}
        </Typography.Text>
        {file && <code className="settings-path-text">{file.path || file.name}</code>}
      </div>
      <div className="settings-row-control">
        <div className="settings-control-stack">
          <div className="settings-button-row">
            <Button className="settings-choose-button" icon={<FolderOpenOutlined />} onClick={onChoose}>
              {chooseLabel}
            </Button>
            <Button icon={<DeleteOutlined />} disabled={!file} onClick={onClear}>
              {clearLabel}
            </Button>
          </div>
          {!file && <Typography.Text type="secondary">{noFileLabel}</Typography.Text>}
        </div>
      </div>
    </div>
  );
}
