import { Button, Space, Typography } from 'antd';
import {
  FileImageOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ImageFolderResult } from '@/shared/types/electron';

interface ImageViewerHeaderProps {
  folder: ImageFolderResult | null;
  loading: boolean;
  onSelectFolder: () => void;
  onSelectImage: () => void;
  t: (key: string) => string;
}

export function ImageViewerHeader({
  folder,
  loading,
  onSelectFolder,
  onSelectImage,
  t,
}: ImageViewerHeaderProps) {
  return (
    <header className="image-viewer-header">
      <div className="image-viewer-title-wrap">
        <span className="image-viewer-title-line">
          <PictureOutlined />
          <Typography.Title className="image-viewer-title" level={3}>
            {t('nav.images')}
          </Typography.Title>
        </span>
        {folder && (
          <p className="image-viewer-path" title={folder.folderPath}>
            {folder.folderPath}
          </p>
        )}
      </div>
      <Space wrap>
        <Button icon={<FileImageOutlined />} loading={loading} onClick={onSelectImage}>
          {t('imageViewer.selectImage')}
        </Button>
        <Button
          type="primary"
          icon={folder ? <ReloadOutlined /> : <FolderOpenOutlined />}
          loading={loading}
          onClick={onSelectFolder}
        >
          {folder ? t('imageViewer.changeFolder') : t('imageViewer.selectFolder')}
        </Button>
      </Space>
    </header>
  );
}
