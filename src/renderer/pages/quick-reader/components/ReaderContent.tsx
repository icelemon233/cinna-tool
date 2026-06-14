import { memo, type ReactNode } from 'react';
import { Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeViewer } from './CodeViewer';
import type { ReaderState } from '../types';

interface ReaderContentProps {
  reader: ReaderState;
}

function ReaderContentComponent({ reader }: ReaderContentProps): ReactNode {
  if (reader.mode === 'markdown') {
    return (
      <Typography>
        <div className="quick-reader-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reader.content}</ReactMarkdown>
        </div>
      </Typography>
    );
  }

  if (reader.mode === 'json' || reader.mode === 'code') {
    return <CodeViewer reader={reader} />;
  }

  return <pre className="quick-reader-text-block">{reader.content}</pre>;
}

export const ReaderContent = memo(ReaderContentComponent);
