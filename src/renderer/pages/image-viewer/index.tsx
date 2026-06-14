import React, { useEffect } from 'react';
import { App } from 'antd';
import { useTranslation } from '@/shared/i18n';
import { ImageViewerEmptyState } from './components/ImageViewerEmptyState';
import { ImageViewerHeader } from './components/ImageViewerHeader';
import { PreviewPanel } from './components/PreviewPanel';
import { ThumbnailPanel } from './components/ThumbnailPanel';
import { useImageDrop } from './hooks/useImageDrop';
import { useImageViewerState } from './hooks/useImageViewerState';
import './index.css';

interface ImageViewerProps {
  active: boolean;
  onActivate?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ active, onActivate }) => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const viewer = useImageViewerState();

  useEffect(() => {
    if (!active || viewer.images.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        viewer.goPrev();
      }
      if (event.key === 'ArrowRight') {
        viewer.goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, viewer.goNext, viewer.goPrev, viewer.images.length]);

  useImageDrop({
    applyFolder: viewer.applyFolder,
    onActivate,
    t,
  });

  const handleSelectFolder = async () => {
    viewer.setLoading(true);
    try {
      const result = await window.electronAPI.selectImageFolder();
      if (!result) return;
      viewer.applyFolder(result);
      if (result.images.length === 0) {
        message.warning(t('imageViewer.noImages'));
      }
    } catch {
      message.error(t('imageViewer.folderFailed'));
    } finally {
      viewer.setLoading(false);
    }
  };

  const handleSelectImage = async () => {
    viewer.setLoading(true);
    try {
      const result = await window.electronAPI.selectImageFile();
      if (!result) return;
      viewer.applyFolder(result);
      if (result.images.length === 0) {
        message.warning(t('imageViewer.noImages'));
      }
    } catch {
      message.error(t('imageViewer.fileFailed'));
    } finally {
      viewer.setLoading(false);
    }
  };

  return (
    <section className={`image-viewer-page${active ? ' is-active' : ''}`}>
      <ImageViewerHeader
        folder={viewer.folder}
        loading={viewer.loading}
        onSelectFolder={handleSelectFolder}
        onSelectImage={handleSelectImage}
        t={t}
      />

      <div className="image-viewer-body">
        {!viewer.folder ? (
          <ImageViewerEmptyState
            description={t('imageViewer.empty')}
            onSelectFolder={handleSelectFolder}
            onSelectImage={handleSelectImage}
            t={t}
          />
        ) : viewer.images.length === 0 ? (
          <ImageViewerEmptyState description={t('imageViewer.noImages')} t={t} />
        ) : (
          <div className="image-viewer-layout">
            <ThumbnailPanel
              folder={viewer.folder}
              images={viewer.images}
              selectedIndex={viewer.selectedIndex}
              setSelectedIndex={viewer.setSelectedIndex}
              t={t}
            />
            <PreviewPanel
              goNext={viewer.goNext}
              goPrev={viewer.goPrev}
              imageCount={viewer.images.length}
              onImageError={() => message.warning(t('imageViewer.loadFailed'))}
              selectedImage={viewer.selectedImage}
              selectedIndex={viewer.selectedIndex}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ImageViewer;
