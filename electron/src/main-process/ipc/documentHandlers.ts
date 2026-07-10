import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

interface SaveGeneratedDocumentRequest {
  content?: unknown;
  fileName?: unknown;
  extension?: unknown;
}

const DEFAULT_FILE_NAME = '工作总结';
const MAX_FILE_NAME_LENGTH = 80;

function sanitizeFileName(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const normalized = raw || DEFAULT_FILE_NAME;
  const safe = normalized
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH);

  return safe || DEFAULT_FILE_NAME;
}

function normalizeExtension(value: unknown): 'md' | 'txt' {
  return value === 'txt' ? 'txt' : 'md';
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getAvailableFilePath(directory: string, fileName: string, extension: 'md' | 'txt'): Promise<string> {
  const basePath = path.join(directory, `${fileName}.${extension}`);
  if (!(await exists(basePath))) {
    return basePath;
  }

  for (let index = 1; index < 1000; index += 1) {
    const nextPath = path.join(directory, `${fileName}-${index}.${extension}`);
    if (!(await exists(nextPath))) {
      return nextPath;
    }
  }

  return path.join(directory, `${fileName}-${Date.now()}.${extension}`);
}

export function registerDocumentHandlers(): void {
  ipcMain.handle('documents:save-generated', async (_event, request: SaveGeneratedDocumentRequest) => {
    const content = typeof request?.content === 'string' ? request.content : '';
    if (!content.trim()) {
      throw new Error('文档内容为空');
    }

    const downloadsPath = app.getPath('downloads');
    await fs.promises.mkdir(downloadsPath, { recursive: true });

    const extension = normalizeExtension(request?.extension);
    const fileName = sanitizeFileName(request?.fileName);
    const filePath = await getAvailableFilePath(downloadsPath, fileName, extension);
    await fs.promises.writeFile(filePath, content, 'utf8');

    return {
      fileName: path.basename(filePath),
      path: filePath,
    };
  });
}
