import { Button, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

interface DownloadsSectionProps {
  downloadPath: string;
  onDownloadFolder: () => void;
  t: (key: string) => string;
}

export function DownloadsSection({
  downloadPath,
  onDownloadFolder,
  t,
}: DownloadsSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t('settings.downloads')}</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <FolderOpenOutlined />
              {t('settings.downloadLocation')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.downloadLocationDesc')}
            </Typography.Text>
            {downloadPath && <code className="settings-path-text">{downloadPath}</code>}
          </div>
          <div className="settings-row-control settings-row-control--button">
            <Button icon={<FolderOpenOutlined />} onClick={onDownloadFolder}>
              {t('settings.changeLocation')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
