import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { WindowState } from '../types';

const DEFAULT_WINDOW_STATE: WindowState = { width: 800, height: 600 };

function getUserDataFilePath(filename: string): string {
  return path.join(app.getPath('userData'), filename);
}

function loadJsonFile<T>(filename: string, fallback: T): T {
  try {
    const filePath = getUserDataFilePath(filename);
    if (!fs.existsSync(filePath)) return fallback;

    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function saveJsonFile(filename: string, value: unknown, pretty = false): void {
  try {
    const filePath = getUserDataFilePath(filename);
    fs.writeFileSync(
      filePath,
      JSON.stringify(value, null, pretty ? 2 : undefined),
      'utf-8'
    );
  } catch {
    // Persistent settings should never crash the app shell.
  }
}

export function loadWindowState(): WindowState {
  return loadJsonFile('window-state.json', DEFAULT_WINDOW_STATE);
}

export function saveWindowState(state: WindowState): void {
  saveJsonFile('window-state.json', state);
}

export function loadConfig(): Record<string, unknown> {
  return loadJsonFile<Record<string, unknown>>('config.json', {});
}

export function saveConfig(config: Record<string, unknown>): void {
  saveJsonFile('config.json', config, true);
}
