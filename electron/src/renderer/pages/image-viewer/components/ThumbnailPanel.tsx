import { memo } from 'react';
import { Tag, Typography } from 'antd';
import type { ImageFileInfo, ImageFolderResult } from '@/shared/types/electron';

interface ThumbnailPanelProps {
  folder: ImageFolderResult;
  images: ImageFileInfo[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  t: (key: string) => string;
}

interface ThumbnailButtonProps {
  image: ImageFileInfo;
  index: number;
  selected: boolean;
  setSelectedIndex: (index: number) => void;
}

const ThumbnailButton = memo(function ThumbnailButton({
  image,
  index,
  selected,
  setSelectedIndex,
}: ThumbnailButtonProps) {
  return (
    <button
      key={image.path}
      className={`image-viewer-thumb-button${selected ? ' is-active' : ''}`}
      title={image.name}
      onClick={() => setSelectedIndex(index)}
    >
      <img src={image.url} alt={image.name} loading="lazy" />
    </button>
  );
});

function ThumbnailPanelComponent({
  folder,
  images,
  selectedIndex,
  setSelectedIndex,
  t,
}: ThumbnailPanelProps) {
  return (
    <aside className="image-viewer-thumb-panel">
      <div className="image-viewer-thumb-header">
        <Typography.Text className="image-viewer-ellipsis" strong title={folder.folderName}>
          {folder.folderName}
        </Typography.Text>
        <Tag>{t('imageViewer.count').replace('{count}', String(images.length))}</Tag>
      </div>
      <div className="image-viewer-thumb-grid">
        {images.map((image, index) => (
          <ThumbnailButton
            key={image.path}
            image={image}
            index={index}
            selected={index === selectedIndex}
            setSelectedIndex={setSelectedIndex}
          />
        ))}
      </div>
    </aside>
  );
}

export const ThumbnailPanel = memo(ThumbnailPanelComponent);
