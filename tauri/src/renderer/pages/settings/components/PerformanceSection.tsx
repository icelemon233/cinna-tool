import { Switch, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

interface PerformanceSectionProps {
  hardwareAcceleration: boolean;
  onHardwareChange: (checked: boolean) => void;
  t: (key: string) => string;
}

export function PerformanceSection({
  hardwareAcceleration,
  onHardwareChange,
  t,
}: PerformanceSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t('settings.performance')}</h2>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-main">
            <div className="settings-row-title">
              <ThunderboltOutlined />
              {t('settings.gpuAcceleration')}
            </div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.gpuAccelerationDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control settings-row-control--switch">
            <Switch checked={hardwareAcceleration} onChange={onHardwareChange} />
          </div>
        </div>
      </div>
    </section>
  );
}
