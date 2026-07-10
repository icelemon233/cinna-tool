export type ReaderMode = 'json' | 'markdown' | 'code' | 'text';

export interface ReaderState {
  mode: ReaderMode;
  title: string;
  content: string;
  language?: string;
}

export const emptyReader: ReaderState = {
  mode: 'text',
  title: '',
  content: '',
};
