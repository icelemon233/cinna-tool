import { useMemo } from 'react';
import { OVERSCAN, ROW_HEIGHT } from '../constants';
import type { SearchResult } from '../types';

export function useVirtualRows(
  results: SearchResult[],
  scrollTop: number,
  viewportHeight: number
) {
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(results.length, startIndex + visibleCount);
    return { startIndex, endIndex };
  }, [results.length, scrollTop, viewportHeight]);

  const visibleResults = results.slice(visibleRange.startIndex, visibleRange.endIndex);
  const visibleWidthCh = useMemo(() => {
    const longestLine = visibleResults.reduce(
      (longest, result) => Math.max(longest, result.text.length),
      80
    );
    return Math.min(Math.max(longestLine, 80), 4000);
  }, [visibleResults]);

  return {
    totalHeight: results.length * ROW_HEIGHT,
    visibleRange,
    visibleResults,
    visibleWidthCh,
  };
}
