export type SectionId = 'user' | 'performance' | 'appearance' | 'downloads' | 'about';
export type WallpaperKind = 'static' | 'dynamic';
export type WallpaperPickerResult = 'selected' | 'canceled' | 'failed';

export interface AppPreferences {
  hardwareAcceleration: boolean;
}
