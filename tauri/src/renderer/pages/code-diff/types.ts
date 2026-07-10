export type DiffSide = 'left' | 'right';

export interface CodeDiffFile {
  content: string;
  loadedAt: number;
  name: string;
  size: number;
  source: 'file' | 'demo';
}

export type DiffRowType = 'equal' | 'changed' | 'delete' | 'add';

export interface InlineSegment {
  text: string;
  type: 'equal' | 'removed' | 'added';
}

export interface DiffRow {
  key: string;
  leftLineNumber?: number;
  leftSegments?: InlineSegment[];
  leftText: string;
  rightLineNumber?: number;
  rightSegments?: InlineSegment[];
  rightText: string;
  type: DiffRowType;
}

export interface DiffStats {
  added: number;
  changed: number;
  removed: number;
  unchanged: number;
}

export interface DiffResult {
  leftLineCount: number;
  mode: 'exact' | 'fast';
  rightLineCount: number;
  rows: DiffRow[];
  stats: DiffStats;
}
