import { Typography } from 'antd';

interface AboutSectionProps {
  appInfo: string[][];
  t: (key: string) => string;
}

export function AboutSection({ appInfo, t }: AboutSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t('settings.about')}</h2>
      <div className="settings-card">
        <div className="settings-row settings-row--app-info">
          <div className="settings-row-main">
            <div className="settings-row-title">{t('settings.appInfo')}</div>
            <Typography.Text className="settings-row-desc" type="secondary">
              {t('settings.appInfoDesc')}
            </Typography.Text>
          </div>
          <div className="settings-row-control">
            <div className="settings-about-grid">
              {appInfo.map(([label, value]) => (
                <div className="settings-about-item" key={label}>
                  <Typography.Text type="secondary">{label}</Typography.Text>
                  <Typography.Title className="settings-about-value" level={5}>
                    {value}
                  </Typography.Title>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
