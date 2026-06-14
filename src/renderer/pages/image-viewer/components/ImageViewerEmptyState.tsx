import { Button, Empty, Space } from 'antd';
import { FileImageOutlined, FolderOpenOutlined } from '@ant-design/icons';

interface ImageViewerEmptyStateProps {
  description: string;
  onSelectFolder?: () => void;
  onSelectImage?: () => void;
  t: (key: string) => string;
}

export function ImageViewerEmptyState({
  description,
  onSelectFolder,
  onSelectImage,
  t,
}: ImageViewerEmptyStateProps) {
  return (
    <div className="image-viewer-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}>
        {onSelectFolder && onSelectImage && (
          <Space>
            <Button icon={<FileImageOutlined />} onClick={onSelectImage}>
              {t('imageViewer.selectImage')}
            </Button>
            <Button type="primary" icon={<FolderOpenOutlined />} onClick={onSelectFolder}>
              {t('imageViewer.selectFolder')}
            </Button>
          </Space>
        )}
      </Empty>
    </div>
  );
}
