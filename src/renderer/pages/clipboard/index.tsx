import React, { useState } from 'react';
import { App as AntdApp, Button, Empty, Input, Popconfirm, Tooltip, Typography } from 'antd';
import {
  ClearOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/shared/i18n';
import {
  useClipboardStore,
  type ClipboardButtonItem,
} from '@/shared/store/clipboardStore';
import './index.css';

function getButtonLabel(item: ClipboardButtonItem): string {
  const label = item.note?.trim() || item.title?.trim() || item.content.replace(/\s+/g, ' ').trim();
  return label || item.content;
}

async function writeClipboardText(text: string): Promise<void> {
  if (window.electronAPI?.writeClipboardText) {
    await window.electronAPI.writeClipboardText(text);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) throw new Error('copy failed');
  }
}

interface ClipboardPageProps {
  mode?: 'main' | 'floating';
}

const ClipboardPage: React.FC<ClipboardPageProps> = ({ mode = 'main' }) => {
  const { message } = AntdApp.useApp();
  const { t } = useTranslation();
  const isFloating = mode === 'floating';
  const items = useClipboardStore((state) => state.items);
  const addItem = useClipboardStore((state) => state.addItem);
  const deleteItem = useClipboardStore((state) => state.deleteItem);
  const clearItems = useClipboardStore((state) => state.clearItems);
  const [draft, setDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const addClipboardButton = (content: string) => {
    const id = addItem(content, noteDraft);
    if (!id) {
      message.warning(t('clipboard.emptyText'));
      return;
    }
    setDraft('');
    setNoteDraft('');
    message.success(t('clipboard.added'));
  };

  const handleReadClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      addClipboardButton(text);
    } catch {
      message.warning(t('clipboard.pasteFailed'));
    }
  };

  const handleOpenFloating = async () => {
    try {
      await window.electronAPI?.openClipboardFloatingWindow();
    } catch {
      message.warning(t('clipboard.floatingFailed'));
    }
  };

  const handleRestoreMain = async () => {
    try {
      await window.electronAPI?.restoreClipboardToMainWindow();
    } catch {
      message.warning(t('clipboard.restoreFailed'));
    }
  };

  const handleCopy = async (item: ClipboardButtonItem) => {
    try {
      await writeClipboardText(item.content);
      setCopiedId(item.id);
      message.success(t('clipboard.copied'));
      window.setTimeout(() => setCopiedId((current) => (current === item.id ? '' : current)), 1200);
    } catch {
      message.warning(t('clipboard.copyFailed'));
    }
  };

  return (
    <section className={`clipboard-page${isFloating ? ' is-floating' : ''}`}>
      <header className="clipboard-header">
        <div className="clipboard-title-wrap">
          <div className="clipboard-title-line">
            <SnippetsOutlined />
            <Typography.Title className="clipboard-title" level={3}>
              {t('clipboard.title')}
            </Typography.Title>
          </div>
          <Typography.Paragraph className="clipboard-subtitle">
            {t('clipboard.subtitle')}
          </Typography.Paragraph>
        </div>
        <div className="clipboard-toolbar">
          {isFloating ? (
            <Button icon={<ImportOutlined />} size="small" onClick={handleRestoreMain}>
              {t('clipboard.restoreMain')}
            </Button>
          ) : (
            <>
              <Button icon={<ExportOutlined />} onClick={handleOpenFloating}>
                {t('clipboard.floatingWindow')}
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleReadClipboard}>
                {t('clipboard.pasteNow')}
              </Button>
              <Popconfirm
                title={t('clipboard.clearConfirm')}
                okText={t('clipboard.clearOk')}
                cancelText={t('clipboard.cancel')}
                disabled={items.length === 0}
                onConfirm={clearItems}
              >
                <Button danger disabled={items.length === 0} icon={<ClearOutlined />}>
                  {t('clipboard.clear')}
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      </header>

      <div className="clipboard-body">
        <section className="clipboard-compose-panel">
          <div className="clipboard-panel-header">
            <Typography.Title className="clipboard-panel-title" level={4}>
              {t('clipboard.newButton')}
            </Typography.Title>
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => addClipboardButton(draft)}
            >
              {t('clipboard.add')}
            </Button>
          </div>
          <Input
            className="clipboard-note-input"
            value={noteDraft}
            placeholder={t('clipboard.notePlaceholder')}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <Input.TextArea
            className="clipboard-draft-input"
            value={draft}
            placeholder={t('clipboard.placeholder')}
            autoSize={false}
            onChange={(event) => setDraft(event.target.value)}
          />
        </section>

        <section className="clipboard-list-panel">
          <div className="clipboard-panel-header">
            <Typography.Title className="clipboard-panel-title" level={4}>
              {t('clipboard.savedButtons')}
            </Typography.Title>
            <Typography.Text className="clipboard-count" type="secondary">
              {t('clipboard.count').replace('{count}', String(items.length))}
            </Typography.Text>
          </div>

          {items.length === 0 ? (
            <Empty className="clipboard-empty" description={t('clipboard.empty')} />
          ) : (
            <div className="clipboard-grid">
              {items.map((item) => (
                <article
                  className={`clipboard-item${copiedId === item.id ? ' is-copied' : ''}`}
                  key={item.id}
                >
                  <button
                    className="clipboard-copy-button"
                    type="button"
                    title={item.content}
                    onClick={() => handleCopy(item)}
                  >
                    <CopyOutlined />
                    <span>{getButtonLabel(item)}</span>
                  </button>
                  <div className="clipboard-item-actions">
                    <Tooltip title={t('clipboard.delete')}>
                      <Button
                        aria-label={t('clipboard.delete')}
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        type="text"
                        onClick={() => deleteItem(item.id)}
                      />
                    </Tooltip>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default ClipboardPage;
