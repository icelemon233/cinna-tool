import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageFileInfo, ImageFolderResult } from '@/shared/types/platform';

export function useImageViewerState() {
  const [folder, setFolder] = useState<ImageFolderResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  const images = folder?.images ?? [];
  const selectedImage = useMemo<ImageFileInfo | null>(
    () => images[selectedIndex] ?? null,
    [images, selectedIndex]
  );

  useEffect(() => {
    if (selectedIndex >= images.length) {
      setSelectedIndex(Math.max(images.length - 1, 0));
    }
  }, [images.length, selectedIndex]);

  const revokeDroppedUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => revokeDroppedUrls, [revokeDroppedUrls]);

  const applyFolder = useCallback(
    (nextFolder: ImageFolderResult, objectUrls: string[] = []) => {
      revokeDroppedUrls();
      objectUrlsRef.current = objectUrls;
      setFolder(nextFolder);
      setSelectedIndex(0);
    },
    [revokeDroppedUrls]
  );

  const goPrev = useCallback(() => {
    setSelectedIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex((current) => Math.min(current + 1, images.length - 1));
  }, [images.length]);

  return {
    applyFolder,
    folder,
    goNext,
    goPrev,
    images,
    loading,
    selectedImage,
    selectedIndex,
    setLoading,
    setSelectedIndex,
  };
}
