import fs from 'fs';
import path from 'path';
import type {
  ImageFileInfo,
  ImageFolderResult,
  WallpaperFileInfo,
  WallpaperKind,
} from '../types';

export const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
  '.avif',
  '.apng',
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);

const allowedImagePaths = new Set<string>();
const allowedWallpaperPaths = new Set<string>();

export function isAllowedImagePath(filePath: string): boolean {
  return allowedImagePaths.has(filePath);
}

export function isAllowedWallpaperPath(filePath: string): boolean {
  return allowedWallpaperPaths.has(filePath);
}

function createImageUrl(filePath: string): string {
  return `cinnatool-image://local?path=${encodeURIComponent(filePath)}`;
}

function createWallpaperUrl(filePath: string, mtime: number): string {
  return `cinnatool-wallpaper://local?path=${encodeURIComponent(filePath)}&v=${Math.round(mtime)}`;
}

function toImageFileInfo(filePath: string): ImageFileInfo | null {
  const extension = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) return null;

  try {
    const stat = fs.statSync(filePath);
    allowedImagePaths.add(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      url: createImageUrl(filePath),
      size: stat.size,
      mtime: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}

export function getWallpaperFilters(kind: WallpaperKind): Electron.FileFilter[] {
  const imageExtensions = Array.from(IMAGE_EXTENSIONS).map((ext) => ext.slice(1));
  const videoExtensions = Array.from(VIDEO_EXTENSIONS).map((ext) => ext.slice(1));

  if (kind === 'static') {
    return [{ name: 'Images', extensions: imageExtensions }];
  }

  return [
    { name: 'Images and Videos', extensions: [...imageExtensions, ...videoExtensions] },
    { name: 'Videos', extensions: videoExtensions },
    { name: 'Images', extensions: imageExtensions },
  ];
}

export function toWallpaperFileInfo(
  filePath: string,
  kind: WallpaperKind
): WallpaperFileInfo | null {
  const extension = path.extname(filePath).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.has(extension);
  const isVideo = VIDEO_EXTENSIONS.has(extension);
  const isSupported = kind === 'static' ? isImage : isImage || isVideo;
  if (!isSupported) return null;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    allowedWallpaperPaths.add(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      url: createWallpaperUrl(filePath, stat.mtimeMs),
      size: stat.size,
      mtime: stat.mtimeMs,
      mediaType: isVideo ? 'video' : 'image',
    };
  } catch {
    return null;
  }
}

export function readImageFolder(folderPath: string): ImageFolderResult {
  const images: ImageFileInfo[] = [];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) continue;

    const image = toImageFileInfo(path.join(folderPath, entry.name));
    if (image) {
      images.push(image);
    }
  }

  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  allowedImagePaths.clear();
  images.forEach((image) => allowedImagePaths.add(image.path));

  return {
    folderPath,
    folderName: path.basename(folderPath),
    images,
  };
}

export function readSingleImage(filePath: string): ImageFolderResult | null {
  allowedImagePaths.clear();
  const image = toImageFileInfo(filePath);
  if (!image) return null;

  return {
    folderPath: path.dirname(filePath),
    folderName: image.name,
    images: [image],
  };
}
