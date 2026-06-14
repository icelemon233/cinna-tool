import { useEffect } from 'react';
import {
  createReaderFromPastedText,
  isEditableTarget,
  isJsonFile,
  isSupportedReaderFile,
  readReaderFile,
} from '../utils/fileSupport';
import { emptyReader, type ReaderState } from '../types';

interface UseQuickReaderEventsOptions {
  message: {
    warning: (content: string) => void;
  };
  onActivate: () => void;
  setReader: (reader: ReaderState) => void;
  t: (key: string) => string;
}

export function useQuickReaderEvents({
  message,
  onActivate,
  setReader,
  t,
}: UseQuickReaderEventsOptions): void {
  useEffect(() => {
    const handleOpen = () => {
      onActivate();
      setReader(emptyReader);
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const text = event.clipboardData?.getData('text/plain') ?? '';
      try {
        const nextReader = createReaderFromPastedText(text, t);
        if (!nextReader) return;
        event.preventDefault();
        onActivate();
        setReader(nextReader);
      } catch {
        event.preventDefault();
        message.warning(t('quickReader.jsonInvalid'));
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (event: DragEvent) => {
      const file = Array.from(event.dataTransfer?.files ?? []).find(isSupportedReaderFile);
      if (!file) return;

      event.preventDefault();
      try {
        const nextReader = await readReaderFile(file);
        onActivate();
        setReader(nextReader);
      } catch {
        message.warning(isJsonFile(file) ? t('quickReader.jsonInvalid') : t('quickReader.fileReadFailed'));
      }
    };

    window.addEventListener('quick-reader:open', handleOpen);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('quick-reader:open', handleOpen);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [message, onActivate, setReader, t]);
}
