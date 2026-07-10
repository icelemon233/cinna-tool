import { Button, Space, Tag, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { ImageFileInfo } from '@/shared/types/platform';
import { formatBytes } from '../utils/fileUtils';

interface PreviewPanelProps {
  goNext: () => void;
  goPrev: () => void;
  imageCount: number;
  onImageError: () => void;
  selectedImage: ImageFileInfo | null;
  selectedIndex: number;
}

export function PreviewPanel({
  goNext,
  goPrev,
  imageCount,
  onImageError,
  selectedImage,
  selectedIndex,
}: PreviewPanelProps) {
  return (
    <main className="image-viewer-preview-panel">
      <div className="image-viewer-preview-header">
        <Space className="image-viewer-preview-meta" orientation="vertical" size={0}>
          <Typography.Text className="image-viewer-preview-name" strong title={selectedImage?.name}>
            {selectedImage?.name}
          </Typography.Text>
          {selectedImage && (
            <Typography.Text className="image-viewer-preview-size" type="secondary">
              {formatBytes(selectedImage.size)}
            </Typography.Text>
          )}
        </Space>
        <Space size={8}>
          <Button icon={<LeftOutlined />} disabled={selectedIndex === 0} onClick={goPrev} />
          <Tag>
            {selectedIndex + 1} / {imageCount}
          </Tag>
          <Button
            icon={<RightOutlined />}
            disabled={selectedIndex >= imageCount - 1}
            onClick={goNext}
          />
        </Space>
      </div>
      <div className="image-viewer-stage">
        {selectedImage && (
          <img
            key={selectedImage.path}
            src={selectedImage.url}
            alt={selectedImage.name}
            onError={onImageError}
          />
        )}
      </div>
    </main>
  );
}
