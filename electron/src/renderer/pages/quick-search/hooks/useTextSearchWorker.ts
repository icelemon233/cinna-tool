import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { SearchResult, SearchStatus, WorkerMessage } from '../types';
import { useDebouncedValue } from './useDebouncedValue';

export function useTextSearchWorker(
  file: File | null,
  query: string,
  caseSensitive: boolean
) {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [bytesRead, setBytesRead] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const pendingResultsRef = useRef<SearchResult[]>([]);
  const resultsFrameRef = useRef<number | null>(null);
  const debouncedQuery = useDebouncedValue(query, 220);

  const clearWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const flushPendingResults = useCallback((immediate = false) => {
    if (resultsFrameRef.current !== null) {
      window.cancelAnimationFrame(resultsFrameRef.current);
      resultsFrameRef.current = null;
    }

    if (pendingResultsRef.current.length === 0) return;
    const nextResults = pendingResultsRef.current;
    pendingResultsRef.current = [];
    const updateResults = () => setResults((current) => [...current, ...nextResults]);

    if (immediate) {
      updateResults();
      return;
    }

    startTransition(updateResults);
  }, []);

  const discardPendingResults = useCallback(() => {
    if (resultsFrameRef.current !== null) {
      window.cancelAnimationFrame(resultsFrameRef.current);
      resultsFrameRef.current = null;
    }
    pendingResultsRef.current = [];
  }, []);

  const resetSearchState = useCallback((nextStatus: SearchStatus = 'idle') => {
    discardPendingResults();
    setResults([]);
    setBytesRead(0);
    setLineCount(0);
    setMatchCount(0);
    setDurationMs(0);
    setError('');
    setStatus(nextStatus);
  }, [discardPendingResults]);

  const scheduleResultsFlush = useCallback(
    (nextResults: SearchResult[]) => {
      pendingResultsRef.current.push(...nextResults);
      if (resultsFrameRef.current !== null) return;

      resultsFrameRef.current = window.requestAnimationFrame(() => {
        resultsFrameRef.current = null;
        flushPendingResults();
      });
    },
    [flushPendingResults]
  );

  useEffect(
    () => () => {
      clearWorker();
      discardPendingResults();
    },
    [clearWorker, discardPendingResults]
  );

  useEffect(() => {
    clearWorker();
    resetSearchState();

    const trimmedQuery = debouncedQuery.trim();
    if (!file || !trimmedQuery) return;

    const worker = new Worker(new URL('../workers/textSearchWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    setStatus('searching');

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const payload = event.data;

      if (payload.type === 'batch') {
        scheduleResultsFlush(payload.results);
      }
      if (payload.type === 'progress') {
        setBytesRead(payload.bytesRead);
        setLineCount(payload.lineCount);
        setMatchCount(payload.matchCount);
      }
      if (payload.type === 'done') {
        flushPendingResults(true);
        setBytesRead(payload.bytesRead);
        setLineCount(payload.lineCount);
        setMatchCount(payload.matchCount);
        setDurationMs(payload.durationMs);
        setStatus('done');
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      }
      if (payload.type === 'error') {
        discardPendingResults();
        setError(payload.message);
        setStatus('error');
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      }
    };

    worker.postMessage({
      type: 'search',
      file,
      query: trimmedQuery,
      caseSensitive,
    });

    return () => {
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
      discardPendingResults();
    };
  }, [
    caseSensitive,
    clearWorker,
    debouncedQuery,
    discardPendingResults,
    file,
    flushPendingResults,
    resetSearchState,
    scheduleResultsFlush,
  ]);

  const resetSearch = useCallback(() => {
    clearWorker();
    resetSearchState();
  }, [clearWorker, resetSearchState]);

  return {
    bytesRead,
    clearWorker,
    debouncedQuery,
    durationMs,
    error,
    lineCount,
    matchCount,
    resetSearch,
    results,
    status,
  };
}
