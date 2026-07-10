import { useEffect } from 'react';
import {
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

    const openFile = async (file: File) => {
      try {
        const nextReader = await readReaderFile(file);
        onActivate();
        setReader(nextReader);
      } catch {
        message.warning(isJsonFile(file) ? t('quickReader.jsonInvalid') : t('quickReader.fileReadFailed'));
      }
    };

    const handleOpenFile = (event: Event) => {
      const file = (event as CustomEvent<{ file?: File }>).detail?.file;
      if (!file || !isSupportedReaderFile(file)) return;

      void openFile(file);
    };

    window.addEventListener('quick-reader:open', handleOpen);
    window.addEventListener('quick-reader:open-file', handleOpenFile);

    return () => {
      window.removeEventListener('quick-reader:open', handleOpen);
      window.removeEventListener('quick-reader:open-file', handleOpenFile);
    };
  }, [message, onActivate, setReader, t]);
}
