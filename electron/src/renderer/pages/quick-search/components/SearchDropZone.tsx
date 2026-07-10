import { Button, Space, Tag, Typography } from 'antd';
import { ClearOutlined, FileTextOutlined } from '@ant-design/icons';
import { formatBytes } from '../utils/formatting';

interface SearchDropZoneProps {
  dragging: boolean;
  file: File | null;
  onClear: () => void;
  onDrop: (file: File | undefined) => void;
  setDragging: (dragging: boolean) => void;
  t: (key: string) => string;
}

export function SearchDropZone({
  dragging,
  file,
  onClear,
  onDrop,
  setDragging,
  t,
}: SearchDropZoneProps) {
  return (
    <div
      className={`quick-search-drop-zone${dragging ? ' is-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onDrop(event.dataTransfer.files[0]);
      }}
    >
      <div className="quick-search-file-meta">
        <div className="quick-search-meta-row">
          <FileTextOutlined />
          <Typography.Text
            className="quick-search-file-name"
            strong
            title={file ? file.name : t('quickSearch.dropTitle')}
          >
            {file ? file.name : t('quickSearch.dropTitle')}
          </Typography.Text>
          {file && <Tag>{formatBytes(file.size)}</Tag>}
        </div>
        <Typography.Text type="secondary">
          {file ? t('quickSearch.dropHintReady') : t('quickSearch.dropHint')}
        </Typography.Text>
      </div>
      <Space size={8}>
        {file && (
          <Button icon={<ClearOutlined />} onClick={onClear}>
            {t('quickSearch.clear')}
          </Button>
        )}
      </Space>
    </div>
  );
}
