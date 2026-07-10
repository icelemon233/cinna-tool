import { useEffect } from 'react';
import type { ImageFolderResult } from '@/shared/types/platform';
import { createDroppedImageFolder, isImageFile } from '../utils/fileUtils';

interface UseImageDropOptions {
  applyFolder: (folder: ImageFolderResult, objectUrls?: string[]) => void;
  onActivate?: () => void;
  t: (key: string) => string;
}

export function useImageDrop({ applyFolder, onActivate, t }: UseImageDropOptions): void {
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (event: DragEvent) => {
      const imageFiles = Array.from(event.dataTransfer?.files ?? []).filter(isImageFile);
      if (imageFiles.length === 0) return;

      event.preventDefault();
      const { result, urls } = createDroppedImageFolder(imageFiles, t('imageViewer.droppedImages'));
      applyFolder(result, urls);
      onActivate?.();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [applyFolder, onActivate, t]);
}
