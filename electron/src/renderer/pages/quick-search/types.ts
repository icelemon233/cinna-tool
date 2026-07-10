export interface SearchResult {
  lineNumber: number;
  text: string;
}

export interface QuickSearchDropRequest {
  id: number;
  file: File;
}

export interface SearchDone {
  bytesRead: number;
  lineCount: number;
  matchCount: number;
  durationMs: number;
}

export type WorkerMessage =
  | { type: 'batch'; results: SearchResult[] }
  | { type: 'progress'; bytesRead: number; lineCount: number; matchCount: number }
  | ({ type: 'done' } & SearchDone)
  | { type: 'error'; message: string };

export type SearchStatus = 'idle' | 'searching' | 'done' | 'error';
