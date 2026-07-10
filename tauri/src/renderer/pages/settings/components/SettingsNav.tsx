import { sections } from '../options';
import type { SectionId } from '../types';

interface SettingsNavProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  t: (key: string) => string;
}

function navButtonClass(active: boolean): string {
  return `settings-nav-button${active ? ' is-active' : ''}`;
}

export function SettingsNav({ activeSection, onSectionChange, t }: SettingsNavProps) {
  return (
    <aside className="settings-nav">
      <div className="settings-nav-title">{t('settings.title')}</div>
      {sections.map((section) => (
        <button
          key={section.id}
          className={navButtonClass(activeSection === section.id)}
          onClick={() => onSectionChange(section.id)}
        >
          {section.icon}
          {t(section.labelKey)}
        </button>
      ))}
    </aside>
  );
}
