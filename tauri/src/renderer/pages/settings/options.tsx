import type React from 'react';
import {
  BgColorsOutlined,
  ApiOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ThemeType } from '@/shared/store/settingsStore';
import type { SectionId } from './types';

export const themeOptions: Array<{ id: ThemeType; labelKey: string; color: string }> = [
  { id: 'mint', labelKey: 'theme.mint', color: '#2db5b5' },
  { id: 'peach', labelKey: 'theme.peach', color: '#c85f35' },
  { id: 'sakura', labelKey: 'theme.sakura', color: '#b94387' },
  { id: 'lavender', labelKey: 'theme.lavender', color: '#6b5ce7' },
  { id: 'lemon', labelKey: 'theme.lemon', color: '#927a00' },
  { id: 'dark', labelKey: 'theme.dark', color: '#1a1a1a' },
];

export const sections: Array<{ id: SectionId; icon: React.ReactNode; labelKey: string }> = [
  { id: 'ai', icon: <ApiOutlined />, labelKey: 'settings.ai' },
  { id: 'performance', icon: <ThunderboltOutlined />, labelKey: 'settings.performance' },
  { id: 'appearance', icon: <BgColorsOutlined />, labelKey: 'settings.appearance' },
  { id: 'downloads', icon: <DownloadOutlined />, labelKey: 'settings.downloads' },
  { id: 'about', icon: <InfoCircleOutlined />, labelKey: 'settings.about' },
];
