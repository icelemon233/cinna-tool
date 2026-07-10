import type React from 'react';

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function renderHighlightedLine(
  text: string,
  query: string,
  caseSensitive: boolean
): React.ReactNode {
  const needle = query.trim();
  if (!needle) return text;

  const source = caseSensitive ? text : text.toLowerCase();
  const target = caseSensitive ? needle : needle.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = source.indexOf(target);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }
    nodes.push(
      <mark key={`${matchIndex}-${nodes.length}`}>
        {text.slice(matchIndex, matchIndex + needle.length)}
      </mark>
    );
    cursor = matchIndex + needle.length;
    matchIndex = source.indexOf(target, cursor);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
