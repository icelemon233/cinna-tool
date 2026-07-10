import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeViewer } from './CodeViewer';
import type { ReaderState } from '../types';
import {
  renderSearchHighlightedNodes,
  renderSearchHighlightedText,
  scrollActiveSearchMatch,
  type ReaderSearchState,
} from '../utils/searchHighlight';

interface ReaderContentProps {
  reader: ReaderState;
  searchState: ReaderSearchState;
}

function ReaderContentComponent({ reader, searchState }: ReaderContentProps): ReactNode {
  const markdownRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLPreElement>(null);
  const highlightedText = useMemo(
    () =>
      renderSearchHighlightedText(reader.content, searchState.query, searchState.activeIndex, {
        current: 0,
      }),
    [reader.content, searchState.activeIndex, searchState.query]
  );

  useEffect(() => {
    if (reader.mode === 'markdown') {
      scrollActiveSearchMatch(markdownRef.current, searchState.query, searchState.activeIndex);
      return;
    }

    if (reader.mode === 'text') {
      scrollActiveSearchMatch(textRef.current, searchState.query, searchState.activeIndex);
    }
  }, [reader.mode, searchState.activeIndex, searchState.query]);

  if (reader.mode === 'markdown') {
    const searchCounter = { current: 0 };
    const highlightChildren = (children: ReactNode) =>
      renderSearchHighlightedNodes(
        children,
        searchState.query,
        searchState.activeIndex,
        searchCounter
      );
    const markdownComponents = {
      blockquote: ({ node: _node, children, ...props }: any) => (
        <blockquote {...props}>{highlightChildren(children)}</blockquote>
      ),
      h1: ({ node: _node, children, ...props }: any) => (
        <h1 {...props}>{highlightChildren(children)}</h1>
      ),
      h2: ({ node: _node, children, ...props }: any) => (
        <h2 {...props}>{highlightChildren(children)}</h2>
      ),
      h3: ({ node: _node, children, ...props }: any) => (
        <h3 {...props}>{highlightChildren(children)}</h3>
      ),
      h4: ({ node: _node, children, ...props }: any) => (
        <h4 {...props}>{highlightChildren(children)}</h4>
      ),
      h5: ({ node: _node, children, ...props }: any) => (
        <h5 {...props}>{highlightChildren(children)}</h5>
      ),
      h6: ({ node: _node, children, ...props }: any) => (
        <h6 {...props}>{highlightChildren(children)}</h6>
      ),
      li: ({ node: _node, children, ...props }: any) => (
        <li {...props}>{highlightChildren(children)}</li>
      ),
      p: ({ node: _node, children, ...props }: any) => (
        <p {...props}>{highlightChildren(children)}</p>
      ),
      pre: ({ node: _node, children, ...props }: any) => (
        <pre {...props}>{highlightChildren(children)}</pre>
      ),
      td: ({ node: _node, children, ...props }: any) => (
        <td {...props}>{highlightChildren(children)}</td>
      ),
      th: ({ node: _node, children, ...props }: any) => (
        <th {...props}>{highlightChildren(children)}</th>
      ),
    };

    return (
      <Typography>
        <div className="quick-reader-markdown" ref={markdownRef}>
          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
            {reader.content}
          </ReactMarkdown>
        </div>
      </Typography>
    );
  }

  if (reader.mode === 'json' || reader.mode === 'code') {
    return <CodeViewer reader={reader} searchState={searchState} />;
  }

  return (
    <pre className="quick-reader-text-block" ref={textRef}>
      {highlightedText}
    </pre>
  );
}

export const ReaderContent = memo(ReaderContentComponent);
