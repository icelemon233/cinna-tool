import React from 'react';

export interface ReaderSearchState {
  query: string;
  activeIndex: number;
}

interface SearchCounter {
  current: number;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function countSearchMatches(text: string, query: string): number {
  const needle = normalizeSearchQuery(query);
  if (!needle) return 0;

  const haystack = text.toLowerCase();
  let count = 0;
  let cursor = 0;

  while (cursor < haystack.length) {
    const matchIndex = haystack.indexOf(needle, cursor);
    if (matchIndex === -1) break;
    count += 1;
    cursor = matchIndex + needle.length;
  }

  return count;
}

export function renderSearchHighlightedText(
  text: string,
  query: string,
  activeIndex: number,
  counter: SearchCounter
): React.ReactNode[] {
  const needle = normalizeSearchQuery(query);
  if (!needle) return [text];

  const nodes: React.ReactNode[] = [];
  const haystack = text.toLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = haystack.indexOf(needle, cursor);
    if (matchIndex === -1) break;

    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    const globalIndex = counter.current++;
    nodes.push(
      <mark
        className={`quick-reader-search-hit${globalIndex === activeIndex ? ' is-active' : ''}`}
        data-search-match-index={globalIndex}
        key={`search-${globalIndex}-${matchIndex}`}
      >
        {text.slice(matchIndex, matchIndex + needle.length)}
      </mark>
    );
    cursor = matchIndex + needle.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function renderSearchHighlightedNodes(
  children: React.ReactNode,
  query: string,
  activeIndex: number,
  counter: SearchCounter
): React.ReactNode[] {
  if (!normalizeSearchQuery(query)) return React.Children.toArray(children);

  return React.Children.toArray(children).flatMap((child) => {
    if (typeof child === 'string') {
      return renderSearchHighlightedText(child, query, activeIndex, counter);
    }

    if (typeof child === 'number') {
      return renderSearchHighlightedText(String(child), query, activeIndex, counter);
    }

    if (!React.isValidElement(child)) {
      return child;
    }

    const element = child as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children === undefined) return element;

    return React.cloneElement(
      element,
      undefined,
      renderSearchHighlightedNodes(element.props.children, query, activeIndex, counter)
    );
  });
}

export function scrollActiveSearchMatch(
  container: HTMLElement | null,
  query: string,
  activeIndex: number
): void {
  if (!container || !normalizeSearchQuery(query)) return;

  const activeMatch = container.querySelector<HTMLElement>(
    `[data-search-match-index="${activeIndex}"]`
  );
  activeMatch?.scrollIntoView({
    block: 'center',
    inline: 'nearest',
  });
}
