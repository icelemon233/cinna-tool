import React from 'react';
import { Tabs } from 'antd';
import { SnippetsOutlined, TranslationOutlined } from '@ant-design/icons';
import ClipboardPage from '@/pages/clipboard';
import TranslationPage from '@/pages/translation';
import { useTranslation } from '@/shared/i18n';
import './index.css';

const FloatingToolsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="floating-tools-window">
      <Tabs
        className="floating-tools-tabs"
        defaultActiveKey="clipboard"
        items={[
          {
            key: 'translation',
            label: <span><TranslationOutlined />{t('translation.title')}</span>,
            children: <TranslationPage mode="floating" />,
          },
          {
            key: 'clipboard',
            label: <span><SnippetsOutlined />{t('clipboard.title')}</span>,
            children: <ClipboardPage mode="floating" />,
          },
        ]}
      />
    </section>
  );
};

export default FloatingToolsPage;
