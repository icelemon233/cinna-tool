import type React from 'react';

const codeKeywordPattern = /\b(?:abstract|async|await|break|case|catch|class|const|continue|def|default|defer|do|else|enum|export|extends|final|finally|for|from|func|function|go|if|implements|import|in|interface|let|match|module|new|null|package|private|protected|public|return|select|static|struct|switch|throw|trait|try|type|var|void|while|with|yield)\b/g;
const tokenPattern = /(\/\/.*|#.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:true|false)\b|\bnull\b|\b\d+(?:\.\d+)?\b|[{}[\]().,;:+\-*/%=<>!&|?])/g;

function getTokenClass(token: string): string {
  if (/^(\/\/|#|\/\*)/.test(token)) return 'token-comment';
  if (/^["'`]/.test(token)) return 'token-string';
  if (/^\d/.test(token)) return 'token-number';
  if (/^(true|false)$/.test(token)) return 'token-boolean';
  if (token === 'null') return 'token-null';
  if (codeKeywordPattern.test(token)) {
    codeKeywordPattern.lastIndex = 0;
    return 'token-keyword';
  }
  codeKeywordPattern.lastIndex = 0;
  return 'token-punctuation';
}

function renderKeywordText(text: string, keyOffset: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  codeKeywordPattern.lastIndex = 0;

  while ((match = codeKeywordPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    nodes.push(
      <span key={`kw-${keyOffset}-${match.index}`} className="token-keyword">
        {match[0]}
      </span>
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  codeKeywordPattern.lastIndex = 0;
  return nodes;
}

export function renderHighlightedLine(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  tokenPattern.lastIndex = 0;

  while ((match = tokenPattern.exec(line)) !== null) {
    if (match.index > cursor) {
      const raw = line.slice(cursor, match.index);
      nodes.push(...renderKeywordText(raw, nodes.length));
    }

    const token = match[0];
    nodes.push(
      <span key={`${match.index}-${nodes.length}`} className={getTokenClass(token)}>
        {token}
      </span>
    );
    cursor = match.index + token.length;
  }

  if (cursor < line.length) {
    nodes.push(...renderKeywordText(line.slice(cursor), nodes.length));
  }

  return nodes;
}
