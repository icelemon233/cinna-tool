import type { ReaderState } from '../types';

const textExtensions = new Set([
  '.txt',
  '.text',
  '.log',
  '.out',
  '.err',
  '.csv',
  '.tsv',
  '.json',
  '.md',
  '.markdown',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.htm',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.env',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.cc',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.swift',
  '.kt',
  '.kts',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.bat',
  '.dockerfile',
]);

const plainTextExtensions = new Set(['.txt', '.text', '.log', '.out', '.err', '.csv', '.tsv']);

const codeLanguageByExtension: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'conf',
  '.config': 'config',
  '.env': 'env',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.bat': 'batch',
  '.dockerfile': 'dockerfile',
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, [contenteditable="true"], .ant-input'));
}

function isJsonLike(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

function detectCodeLanguageFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const hasCodeShape =
    /(^|\n)\s*(import|export|const|let|var|function|class|interface|type|def|async|await|return|if|for|while|switch|try|catch)\b/.test(trimmed) ||
    /(^|\n)\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmed) ||
    /(^|\n)\s*<[/]?[a-z][\w:-]*(\s|>|\/>)/i.test(trimmed) ||
    /[{;}]\s*(\n|$)/.test(trimmed);

  if (!hasCodeShape) return null;
  if (/^\s*<[/]?[a-z][\w:-]*(\s|>|\/>)/i.test(trimmed)) return 'html';
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(trimmed)) return 'sql';
  if (/\b(def|elif|print)\b/.test(trimmed)) return 'python';
  if (/\b(interface|type)\s+\w+|:\s*(string|number|boolean|unknown|Record<)/.test(trimmed)) return 'typescript';
  if (/\b(import|export|const|let|async|await|function|class)\b/.test(trimmed)) return 'javascript';
  if (/\b(public|private|protected|class|static|void)\b/.test(trimmed)) return 'java';
  return 'code';
}

function getExtension(file: File): string {
  const name = file.name.toLowerCase();
  if (name === 'dockerfile') return '.dockerfile';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex === -1 ? '' : name.slice(dotIndex);
}

export function isJsonFile(file: File): boolean {
  return getExtension(file) === '.json';
}

function isMarkdownFile(file: File): boolean {
  const extension = getExtension(file);
  return extension === '.md' || extension === '.markdown';
}

function isPlainTextFile(file: File): boolean {
  return plainTextExtensions.has(getExtension(file));
}

export function isSupportedReaderFile(file: File): boolean {
  return file.type.startsWith('text/') || textExtensions.has(getExtension(file));
}

function formatJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2);
}

export function createReaderFromPastedText(
  text: string,
  t: (key: string) => string
): ReaderState | null {
  if (isJsonLike(text)) {
    return {
      mode: 'json',
      title: t('quickReader.jsonLabel'),
      content: formatJson(text),
      language: 'json',
    };
  }

  const language = detectCodeLanguageFromText(text);
  if (!language) return null;

  return {
    mode: 'code',
    title: t('quickReader.codeLabel'),
    content: text.trimEnd(),
    language,
  };
}

export async function readReaderFile(file: File): Promise<ReaderState> {
  const rawText = await file.text();

  if (isJsonFile(file)) {
    return {
      mode: 'json',
      title: file.name,
      content: formatJson(rawText),
      language: 'json',
    };
  }

  if (isMarkdownFile(file)) {
    return {
      mode: 'markdown',
      title: file.name,
      content: rawText,
    };
  }

  if (!isPlainTextFile(file)) {
    const extension = getExtension(file);
    return {
      mode: 'code',
      title: file.name,
      content: rawText,
      language: codeLanguageByExtension[extension] ?? (extension.replace('.', '') || 'code'),
    };
  }

  return {
    mode: 'text',
    title: file.name,
    content: rawText,
  };
}
