import type React from 'react';
import { Button, Checkbox, Input } from 'antd';
import { FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { ACCEPTED_EXTENSIONS } from '../constants';

interface SearchControlsProps {
  caseSensitive: boolean;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCaseSensitiveChange: (checked: boolean) => void;
  onFileSelected: (file: File | undefined) => void;
  onQueryChange: (query: string) => void;
  query: string;
  t: (key: string) => string;
}

export function SearchControls({
  caseSensitive,
  file,
  inputRef,
  onCaseSensitiveChange,
  onFileSelected,
  onQueryChange,
  query,
  t,
}: SearchControlsProps) {
  return (
    <div className="quick-search-controls">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        value={query}
        disabled={!file}
        placeholder={t('quickSearch.placeholder')}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <Checkbox
        className="quick-search-case-checkbox"
        checked={caseSensitive}
        disabled={!file}
        onChange={(event) => onCaseSensitiveChange(event.target.checked)}
      >
        {t('quickSearch.caseSensitive')}
      </Checkbox>
      <Button icon={<FolderOpenOutlined />} onClick={() => inputRef.current?.click()}>
        {t('quickSearch.chooseFile')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="quick-search-file-input"
        onChange={(event) => onFileSelected(event.target.files?.[0])}
      />
    </div>
  );
}
