export const ROW_HEIGHT = 44;
export const OVERSCAN = 10;
export const ACCEPTED_EXTENSIONS = '.log,.txt,.text,.out,.err,.json,.csv,.md';

const quickSearchDropExtensions = new Set(['.log', '.txt', '.text', '.out', '.err', '.csv']);

function getFileExtension(file: File): string {
  const dotIndex = file.name.lastIndexOf('.');
  return dotIndex === -1 ? '' : file.name.slice(dotIndex).toLowerCase();
}

export function isQuickSearchDropFile(file: File): boolean {
  return quickSearchDropExtensions.has(getFileExtension(file));
}
