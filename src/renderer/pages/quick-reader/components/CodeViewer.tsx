import { memo, useMemo } from 'react';
import { renderHighlightedLine } from '../utils/syntaxHighlight';
import type { ReaderState } from '../types';

interface CodeViewerProps {
  reader: ReaderState;
}

function CodeViewerComponent({ reader }: CodeViewerProps) {
  const lines = useMemo(() => reader.content.split(/\r?\n/), [reader.content]);
  const highlightedLines = useMemo(
    () => lines.map((line) => (line ? renderHighlightedLine(line) : '\u00a0')),
    [lines]
  );
  const language = reader.language || (reader.mode === 'json' ? 'json' : 'code');

  return (
    <div className="quick-reader-code-frame">
      <div className="quick-reader-code-header">
        <span>{reader.title}</span>
        <span className="quick-reader-code-language">{language}</span>
      </div>
      <div className="quick-reader-code-body">
        {highlightedLines.map((line, index) => (
          <div className="quick-reader-code-line" key={index}>
            <span className="quick-reader-line-number">{index + 1}</span>
            <code className="quick-reader-line-code">
              {line}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CodeViewer = memo(CodeViewerComponent);
