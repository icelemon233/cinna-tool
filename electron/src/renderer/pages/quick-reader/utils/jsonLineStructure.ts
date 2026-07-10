export type JsonContainerKind = 'object' | 'array';

export interface JsonFoldRegion {
  start: number;
  end: number;
  kind: JsonContainerKind;
  path: string[];
  hiddenLineCount: number;
}

export interface JsonLineInfo {
  path: string[];
}

export interface JsonLineStructure {
  lineInfo: JsonLineInfo[];
  foldRegions: Map<number, JsonFoldRegion>;
}

interface JsonFrame {
  kind: JsonContainerKind;
  path: string[];
  start: number;
  nextIndex: number;
}

const jsonPropertyPattern = /^"((?:\\.|[^"\\])*)"\s*:\s*(.*)$/;

function stripTrailingComma(text: string): string {
  return text.endsWith(',') ? text.slice(0, -1).trimEnd() : text;
}

function decodeJsonKey(rawKey: string): string {
  try {
    return JSON.parse(`"${rawKey}"`) as string;
  } catch {
    return rawKey;
  }
}

function getContainerKind(value: string): JsonContainerKind | null {
  if (value === '{') return 'object';
  if (value === '[') return 'array';
  return null;
}

function createEmptyLineInfo(lines: string[]): JsonLineInfo[] {
  return lines.map(() => ({ path: [] }));
}

export function analyzeJsonLines(lines: string[]): JsonLineStructure {
  const lineInfo = createEmptyLineInfo(lines);
  const foldRegions = new Map<number, JsonFoldRegion>();
  const stack: JsonFrame[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const normalized = stripTrailingComma(trimmed);
    const currentFrame = stack[stack.length - 1];

    if (normalized === '}' || normalized === ']') {
      const closedFrame = stack.pop();
      if (!closedFrame) return;

      lineInfo[index].path = closedFrame.path;
      if (index > closedFrame.start + 1) {
        foldRegions.set(closedFrame.start, {
          start: closedFrame.start,
          end: index,
          kind: closedFrame.kind,
          path: closedFrame.path,
          hiddenLineCount: index - closedFrame.start,
        });
      }
      return;
    }

    const propertyMatch =
      currentFrame?.kind !== 'array' ? normalized.match(jsonPropertyPattern) : null;

    if (propertyMatch) {
      const key = decodeJsonKey(propertyMatch[1]);
      const path = [...(currentFrame?.path ?? []), key];
      const value = propertyMatch[2].trim();
      const containerKind = getContainerKind(value);

      lineInfo[index].path = path;

      if (containerKind) {
        stack.push({
          kind: containerKind,
          path,
          start: index,
          nextIndex: 0,
        });
      }
      return;
    }

    const arrayPath =
      currentFrame?.kind === 'array'
        ? [...currentFrame.path, `[${currentFrame.nextIndex++}]`]
        : (currentFrame?.path ?? []);
    const containerKind = getContainerKind(normalized);

    lineInfo[index].path = arrayPath;

    if (containerKind) {
      stack.push({
        kind: containerKind,
        path: arrayPath,
        start: index,
        nextIndex: 0,
      });
    }
  });

  return {
    lineInfo,
    foldRegions,
  };
}
