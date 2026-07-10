import type { DiffResult, DiffRow, DiffStats, InlineSegment } from '../types';

const MAX_EXACT_DIFF_CELLS = 4_000_000;
const MAX_INLINE_DIFF_CELLS = 120_000;

interface LineRef {
  index: number;
  text: string;
}

type RawLineOp =
  | { type: 'equal'; left: LineRef; right: LineRef }
  | { type: 'delete'; left: LineRef }
  | { type: 'insert'; right: LineRef };

function splitLines(content: string): string[] {
  if (!content) return [];

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function buildExactLineOps(leftLines: string[], rightLines: string[]): RawLineOp[] {
  const columns = rightLines.length + 1;
  const dp = new Uint32Array((leftLines.length + 1) * columns);

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      const cell = leftIndex * columns + rightIndex;
      if (leftLines[leftIndex] === rightLines[rightIndex]) {
        dp[cell] = dp[(leftIndex + 1) * columns + rightIndex + 1] + 1;
      } else {
        dp[cell] = Math.max(
          dp[(leftIndex + 1) * columns + rightIndex],
          dp[leftIndex * columns + rightIndex + 1]
        );
      }
    }
  }

  const ops: RawLineOp[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      ops.push({
        left: { index: leftIndex + 1, text: leftLines[leftIndex] },
        right: { index: rightIndex + 1, text: rightLines[rightIndex] },
        type: 'equal',
      });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const deleteScore = dp[(leftIndex + 1) * columns + rightIndex];
    const insertScore = dp[leftIndex * columns + rightIndex + 1];

    if (deleteScore >= insertScore) {
      ops.push({
        left: { index: leftIndex + 1, text: leftLines[leftIndex] },
        type: 'delete',
      });
      leftIndex += 1;
    } else {
      ops.push({
        right: { index: rightIndex + 1, text: rightLines[rightIndex] },
        type: 'insert',
      });
      rightIndex += 1;
    }
  }

  while (leftIndex < leftLines.length) {
    ops.push({
      left: { index: leftIndex + 1, text: leftLines[leftIndex] },
      type: 'delete',
    });
    leftIndex += 1;
  }

  while (rightIndex < rightLines.length) {
    ops.push({
      right: { index: rightIndex + 1, text: rightLines[rightIndex] },
      type: 'insert',
    });
    rightIndex += 1;
  }

  return ops;
}

function buildFastLineOps(leftLines: string[], rightLines: string[]): RawLineOp[] {
  const ops: RawLineOp[] = [];
  let prefixLength = 0;

  while (
    prefixLength < leftLines.length &&
    prefixLength < rightLines.length &&
    leftLines[prefixLength] === rightLines[prefixLength]
  ) {
    ops.push({
      left: { index: prefixLength + 1, text: leftLines[prefixLength] },
      right: { index: prefixLength + 1, text: rightLines[prefixLength] },
      type: 'equal',
    });
    prefixLength += 1;
  }

  let leftSuffixIndex = leftLines.length - 1;
  let rightSuffixIndex = rightLines.length - 1;
  const suffixOps: RawLineOp[] = [];

  while (
    leftSuffixIndex >= prefixLength &&
    rightSuffixIndex >= prefixLength &&
    leftLines[leftSuffixIndex] === rightLines[rightSuffixIndex]
  ) {
    suffixOps.unshift({
      left: { index: leftSuffixIndex + 1, text: leftLines[leftSuffixIndex] },
      right: { index: rightSuffixIndex + 1, text: rightLines[rightSuffixIndex] },
      type: 'equal',
    });
    leftSuffixIndex -= 1;
    rightSuffixIndex -= 1;
  }

  for (let index = prefixLength; index <= leftSuffixIndex; index += 1) {
    ops.push({
      left: { index: index + 1, text: leftLines[index] },
      type: 'delete',
    });
  }

  for (let index = prefixLength; index <= rightSuffixIndex; index += 1) {
    ops.push({
      right: { index: index + 1, text: rightLines[index] },
      type: 'insert',
    });
  }

  ops.push(...suffixOps);
  return ops;
}

function tokenizeLine(text: string): string[] {
  return text.match(/\s+|[A-Za-z0-9_$]+|[\u4e00-\u9fff]+|./gu) ?? [];
}

function appendSegment(segments: InlineSegment[], segment: InlineSegment): void {
  if (!segment.text) return;

  const last = segments[segments.length - 1];
  if (last?.type === segment.type) {
    last.text += segment.text;
    return;
  }
  segments.push({ ...segment });
}

function createInlineDiff(leftText: string, rightText: string): {
  leftSegments: InlineSegment[];
  rightSegments: InlineSegment[];
} {
  if (leftText === rightText) {
    const segment: InlineSegment = { text: leftText, type: 'equal' };
    return {
      leftSegments: [segment],
      rightSegments: [segment],
    };
  }

  const leftTokens = tokenizeLine(leftText);
  const rightTokens = tokenizeLine(rightText);
  const cellCount = (leftTokens.length + 1) * (rightTokens.length + 1);

  if (cellCount > MAX_INLINE_DIFF_CELLS) {
    return {
      leftSegments: [{ text: leftText, type: 'removed' }],
      rightSegments: [{ text: rightText, type: 'added' }],
    };
  }

  const columns = rightTokens.length + 1;
  const dp = new Uint32Array((leftTokens.length + 1) * columns);

  for (let leftIndex = leftTokens.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightTokens.length - 1; rightIndex >= 0; rightIndex -= 1) {
      const cell = leftIndex * columns + rightIndex;
      if (leftTokens[leftIndex] === rightTokens[rightIndex]) {
        dp[cell] = dp[(leftIndex + 1) * columns + rightIndex + 1] + 1;
      } else {
        dp[cell] = Math.max(
          dp[(leftIndex + 1) * columns + rightIndex],
          dp[leftIndex * columns + rightIndex + 1]
        );
      }
    }
  }

  const leftSegments: InlineSegment[] = [];
  const rightSegments: InlineSegment[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftTokens.length && rightIndex < rightTokens.length) {
    if (leftTokens[leftIndex] === rightTokens[rightIndex]) {
      appendSegment(leftSegments, { text: leftTokens[leftIndex], type: 'equal' });
      appendSegment(rightSegments, { text: rightTokens[rightIndex], type: 'equal' });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const deleteScore = dp[(leftIndex + 1) * columns + rightIndex];
    const insertScore = dp[leftIndex * columns + rightIndex + 1];

    if (deleteScore >= insertScore) {
      appendSegment(leftSegments, { text: leftTokens[leftIndex], type: 'removed' });
      leftIndex += 1;
    } else {
      appendSegment(rightSegments, { text: rightTokens[rightIndex], type: 'added' });
      rightIndex += 1;
    }
  }

  while (leftIndex < leftTokens.length) {
    appendSegment(leftSegments, { text: leftTokens[leftIndex], type: 'removed' });
    leftIndex += 1;
  }

  while (rightIndex < rightTokens.length) {
    appendSegment(rightSegments, { text: rightTokens[rightIndex], type: 'added' });
    rightIndex += 1;
  }

  return { leftSegments, rightSegments };
}

function createStats(rows: DiffRow[]): DiffStats {
  return rows.reduce<DiffStats>(
    (stats, row) => {
      if (row.type === 'equal') stats.unchanged += 1;
      if (row.type === 'changed') stats.changed += 1;
      if (row.type === 'delete') stats.removed += 1;
      if (row.type === 'add') stats.added += 1;
      return stats;
    },
    {
      added: 0,
      changed: 0,
      removed: 0,
      unchanged: 0,
    }
  );
}

function toRows(ops: RawLineOp[]): DiffRow[] {
  const rows: DiffRow[] = [];
  const deletedLines: LineRef[] = [];
  const insertedLines: LineRef[] = [];
  let rowIndex = 0;

  const flushChangeBlock = () => {
    const blockLength = Math.max(deletedLines.length, insertedLines.length);

    for (let index = 0; index < blockLength; index += 1) {
      const deletedLine = deletedLines[index];
      const insertedLine = insertedLines[index];
      const key = `diff-row-${rowIndex}`;
      rowIndex += 1;

      if (deletedLine && insertedLine) {
        const inlineDiff = createInlineDiff(deletedLine.text, insertedLine.text);
        rows.push({
          key,
          leftLineNumber: deletedLine.index,
          leftSegments: inlineDiff.leftSegments,
          leftText: deletedLine.text,
          rightLineNumber: insertedLine.index,
          rightSegments: inlineDiff.rightSegments,
          rightText: insertedLine.text,
          type: 'changed',
        });
        continue;
      }

      if (deletedLine) {
        rows.push({
          key,
          leftLineNumber: deletedLine.index,
          leftSegments: [{ text: deletedLine.text, type: 'removed' }],
          leftText: deletedLine.text,
          rightText: '',
          type: 'delete',
        });
        continue;
      }

      if (insertedLine) {
        rows.push({
          key,
          leftText: '',
          rightLineNumber: insertedLine.index,
          rightSegments: [{ text: insertedLine.text, type: 'added' }],
          rightText: insertedLine.text,
          type: 'add',
        });
      }
    }

    deletedLines.length = 0;
    insertedLines.length = 0;
  };

  for (const op of ops) {
    if (op.type === 'delete') {
      deletedLines.push(op.left);
      continue;
    }

    if (op.type === 'insert') {
      insertedLines.push(op.right);
      continue;
    }

    flushChangeBlock();
    rows.push({
      key: `diff-row-${rowIndex}`,
      leftLineNumber: op.left.index,
      leftSegments: [{ text: op.left.text, type: 'equal' }],
      leftText: op.left.text,
      rightLineNumber: op.right.index,
      rightSegments: [{ text: op.right.text, type: 'equal' }],
      rightText: op.right.text,
      type: 'equal',
    });
    rowIndex += 1;
  }

  flushChangeBlock();
  return rows;
}

export function createDiffResult(leftContent: string, rightContent: string): DiffResult {
  const leftLines = splitLines(leftContent);
  const rightLines = splitLines(rightContent);
  const cellCount = (leftLines.length + 1) * (rightLines.length + 1);
  const mode = cellCount <= MAX_EXACT_DIFF_CELLS ? 'exact' : 'fast';
  const ops = mode === 'exact'
    ? buildExactLineOps(leftLines, rightLines)
    : buildFastLineOps(leftLines, rightLines);
  const rows = toRows(ops);

  return {
    leftLineCount: leftLines.length,
    mode,
    rightLineCount: rightLines.length,
    rows,
    stats: createStats(rows),
  };
}
