import AiSettingsForm from './AISettingsForm';
import type { ChatSettings } from '@/shared/store/chatStore';
import type { ModelInfo } from '@/shared/types/platform';

interface AISettingsSectionProps {
  models: ModelInfo[];
  onSave: (settings: Partial<ChatSettings>) => void;
  settings: ChatSettings;
  t: (key: string) => string;
}

export function AISettingsSection({ models, onSave, settings, t }: AISettingsSectionProps) {
  return (
    <section className="settings-section settings-ai-section">
      <h2 className="settings-section-title">{t('settings.aiSectionTitle')}</h2>
      <div className="settings-card">
        <AiSettingsForm models={models} onSave={onSave} settings={settings} />
      </div>
    </section>
  );
}
