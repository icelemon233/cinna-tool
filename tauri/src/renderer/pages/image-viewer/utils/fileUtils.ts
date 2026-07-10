import type { ImageFolderResult } from '@/shared/types/platform';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif']);

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getFileExtension(file: File): string {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex === -1 ? '' : file.name.slice(dotIndex).toLowerCase();
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(getFileExtension(file));
}

export function createDroppedImageFolder(
  files: File[],
  groupName: string
): { result: ImageFolderResult; urls: string[] } {
  const urls: string[] = [];
  const images = files.filter(isImageFile).map((file, index) => {
    const url = URL.createObjectURL(file);
    urls.push(url);
    return {
      name: file.name,
      path: `dropped://${file.name}-${file.lastModified}-${index}`,
      url,
      size: file.size,
      mtime: file.lastModified,
    };
  });

  return {
    urls,
    result: {
      folderPath: files.length === 1 ? files[0].name : groupName,
      folderName: files.length === 1 ? files[0].name : groupName,
      images,
    },
  };
}
