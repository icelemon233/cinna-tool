import type React from 'react';
import {
  CodeOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ReaderMode } from '../types';

export function getModeIcon(mode: ReaderMode): React.ReactNode {
  if (mode === 'json' || mode === 'code') return <CodeOutlined />;
  if (mode === 'markdown') return <FileMarkdownOutlined />;
  return <FileTextOutlined />;
}

export function getModeLabel(mode: ReaderMode, t: (key: string) => string): string {
  if (mode === 'json') return t('quickReader.jsonLabel');
  if (mode === 'markdown') return t('quickReader.markdownLabel');
  if (mode === 'code') return t('quickReader.codeLabel');
  return t('quickReader.textLabel');
}
