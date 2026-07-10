import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { ThemeType } from '@/shared/store/settingsStore';

export interface AppThemeTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  accent: string;
  accentLight: string;
  sidebarBg: string;
  sidebarText: string;
  topbarBg: string;
}

const themeTokens: Record<ThemeType, AppThemeTokens> = {
  mint: {
    bgPrimary: '#d4f0f0',
    bgSecondary: '#b8e6e6',
    bgCard: '#ffffff',
    textPrimary: '#1a3a3a',
    textSecondary: '#3d6b6b',
    textMuted: '#7aabab',
    borderColor: '#a8d8d8',
    accent: '#2db5b5',
    accentLight: 'rgba(45, 181, 181, 0.12)',
    sidebarBg: '#1a3a3a',
    sidebarText: '#d4f0f0',
    topbarBg: '#ffffff',
  },
  peach: {
    bgPrimary: '#f0c9bb',
    bgSecondary: '#e4ad99',
    bgCard: '#fffaf8',
    textPrimary: '#3d2017',
    textSecondary: '#6b4030',
    textMuted: '#956b5d',
    borderColor: '#d9aa96',
    accent: '#c85f35',
    accentLight: 'rgba(200, 95, 53, 0.14)',
    sidebarBg: '#3d2017',
    sidebarText: '#f8d8ce',
    topbarBg: '#fffaf8',
  },
  sakura: {
    bgPrimary: '#ead2e4',
    bgSecondary: '#ddb6d3',
    bgCard: '#fff9fd',
    textPrimary: '#35162e',
    textSecondary: '#63315a',
    textMuted: '#98708f',
    borderColor: '#d4aaca',
    accent: '#b94387',
    accentLight: 'rgba(185, 67, 135, 0.14)',
    sidebarBg: '#37172f',
    sidebarText: '#f1d6e8',
    topbarBg: '#fff9fd',
  },
  lavender: {
    bgPrimary: '#e2dfff',
    bgSecondary: '#ccc8f0',
    bgCard: '#ffffff',
    textPrimary: '#1f1a40',
    textSecondary: '#3d3570',
    textMuted: '#7a70b0',
    borderColor: '#c4bef0',
    accent: '#6b5ce7',
    accentLight: 'rgba(107, 92, 231, 0.12)',
    sidebarBg: '#1f1a40',
    sidebarText: '#e2dfff',
    topbarBg: '#ffffff',
  },
  lemon: {
    bgPrimary: '#e1d48f',
    bgSecondary: '#cab95e',
    bgCard: '#fffdf0',
    textPrimary: '#352f11',
    textSecondary: '#665a22',
    textMuted: '#8a7b3d',
    borderColor: '#bdad55',
    accent: '#927a00',
    accentLight: 'rgba(146, 122, 0, 0.16)',
    sidebarBg: '#352f11',
    sidebarText: '#f4eab5',
    topbarBg: '#fffdf0',
  },
  dark: {
    bgPrimary: '#1a1a1a',
    bgSecondary: '#252525',
    bgCard: '#2a2a2a',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#888888',
    borderColor: '#3a3a3a',
    accent: '#6aa8ff',
    accentLight: 'rgba(106, 168, 255, 0.14)',
    sidebarBg: '#111111',
    sidebarText: '#ffffff',
    topbarBg: '#1a1a1a',
  },
};

export function getAppThemeTokens(theme: ThemeType): AppThemeTokens {
  return themeTokens[theme];
}

export function getAntdTheme(theme: ThemeType): ThemeConfig {
  const tokens = getAppThemeTokens(theme);

  return {
    algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: tokens.accent,
      colorInfo: tokens.accent,
      colorBgBase: tokens.bgPrimary,
      colorBgContainer: tokens.bgCard,
      colorBgElevated: tokens.bgCard,
      colorText: tokens.textPrimary,
      colorTextSecondary: tokens.textSecondary,
      colorTextTertiary: tokens.textMuted,
      colorBorder: tokens.borderColor,
      borderRadius: 8,
      borderRadiusLG: 8,
      borderRadiusSM: 6,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
    components: {
      Button: {
        borderRadius: 8,
        controlHeight: 34,
      },
      Input: {
        borderRadius: 8,
        controlHeight: 34,
      },
      Menu: {
        itemBorderRadius: 8,
        itemHeight: 40,
      },
      Modal: {
        borderRadiusLG: 8,
      },
      Drawer: {
        colorBgElevated: tokens.bgCard,
      },
    },
  };
}
