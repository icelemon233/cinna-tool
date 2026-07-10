interface SearchRequest {
  type: 'search';
  file: File;
  query: string;
  caseSensitive: boolean;
}

interface SearchResult {
  lineNumber: number;
  text: string;
}

const ctx = self as unknown as Worker;
const BATCH_SIZE = 200;
const PROGRESS_INTERVAL_MS = 80;

function createMatcher(query: string, caseSensitive: boolean) {
  const target = caseSensitive ? query : query.toLowerCase();

  return (line: string) => {
    if (caseSensitive) {
      return line.includes(target);
    }
    return line.toLowerCase().includes(target);
  };
}

async function searchFile(file: File, query: string, caseSensitive: boolean) {
  const startedAt = performance.now();
  const matchesLine = createMatcher(query, caseSensitive);
  const decoder = new TextDecoder('utf-8');
  const reader = file.stream().getReader();
  let leftover = '';
  let lineNumber = 1;
  let bytesRead = 0;
  let matchCount = 0;
  let batch: SearchResult[] = [];
  let lastProgressAt = 0;

  const flushBatch = () => {
    if (batch.length === 0) return;
    ctx.postMessage({ type: 'batch', results: batch });
    batch = [];
  };

  const pushProgress = (force = false) => {
    const now = performance.now();
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    ctx.postMessage({
      type: 'progress',
      bytesRead,
      lineCount: Math.max(lineNumber - 1, 0),
      matchCount,
    });
  };

  const processLine = (line: string) => {
    if (matchesLine(line)) {
      batch.push({ lineNumber, text: line });
      matchCount += 1;
      if (batch.length >= BATCH_SIZE) {
        flushBatch();
      }
    }
    lineNumber += 1;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    const chunk = decoder.decode(value, { stream: true });
    const combined = leftover + chunk;
    const lines = combined.split(/\r?\n/);
    leftover = lines.pop() ?? '';

    for (const line of lines) {
      processLine(line);
    }

    pushProgress();
  }

  const tail = decoder.decode();
  if (tail) {
    leftover += tail;
  }
  if (leftover) {
    processLine(leftover.endsWith('\r') ? leftover.slice(0, -1) : leftover);
  }

  flushBatch();
  pushProgress(true);
  ctx.postMessage({
    type: 'done',
    bytesRead,
    lineCount: Math.max(lineNumber - 1, 0),
    matchCount,
    durationMs: Math.round(performance.now() - startedAt),
  });
}

ctx.addEventListener('message', (event: MessageEvent<SearchRequest>) => {
  const payload = event.data;
  if (payload.type !== 'search') return;

  const query = payload.query.trim();
  if (!query) {
    ctx.postMessage({
      type: 'done',
      bytesRead: 0,
      lineCount: 0,
      matchCount: 0,
      durationMs: 0,
    });
    return;
  }

  searchFile(payload.file, query, payload.caseSensitive).catch((error: unknown) => {
    ctx.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  });
});
