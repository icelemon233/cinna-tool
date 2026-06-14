import { ipcMain } from 'electron';
import {
  abortClaudeCode,
  getClaudeCodeConfigKey,
  getClaudeCodeStatus,
  getDefaultClaudeCodeConfig,
  listClaudeCodeDirectory,
  readClaudeCodeConfig,
  readClaudeCodeFile,
  runClaudeCode,
} from '../services/claudeCode';
import type { ClaudeCodeConfig, ClaudeCodeRunRequest, IpcContext } from '../types';
import { loadConfig, saveConfig } from '../utils/jsonStore';
import { showOpenDialog } from './dialog';

function loadClaudeConfig(): ClaudeCodeConfig {
  const config = loadConfig();
  return readClaudeCodeConfig(() => config[getClaudeCodeConfigKey()]);
}

function saveClaudeConfig(configValue: ClaudeCodeConfig): ClaudeCodeConfig {
  const config = loadConfig();
  const nextConfig = {
    ...getDefaultClaudeCodeConfig(),
    ...configValue,
    additionalDirs: Array.isArray(configValue.additionalDirs) ? configValue.additionalDirs : [],
  };
  config[getClaudeCodeConfigKey()] = nextConfig;
  saveConfig(config);
  return nextConfig;
}

export function registerClaudeCodeHandlers(context: IpcContext): void {
  ipcMain.handle('cc:get-config', () => loadClaudeConfig());

  ipcMain.handle('cc:save-config', (_event, config: ClaudeCodeConfig) => {
    return saveClaudeConfig(config);
  });

  ipcMain.handle('cc:select-project', async () => {
    const result = await showOpenDialog(context, {
      title: '选择 Claude Code 项目目录',
      properties: ['openDirectory'],
    });

    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('cc:select-mcp-config', async () => {
    const result = await showOpenDialog(context, {
      title: '选择 MCP 配置文件',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('cc:list-directory', (_event, directoryPath?: string) => {
    return listClaudeCodeDirectory(loadClaudeConfig(), directoryPath);
  });

  ipcMain.handle('cc:read-file', (_event, filePath: string) => {
    return readClaudeCodeFile(loadClaudeConfig(), filePath);
  });

  ipcMain.handle('cc:status', (_event, config?: Partial<ClaudeCodeConfig>) => {
    return getClaudeCodeStatus(config || loadClaudeConfig());
  });

  ipcMain.handle('cc:run', (event, request: ClaudeCodeRunRequest) => {
    return runClaudeCode(request, event.sender);
  });

  ipcMain.handle('cc:abort', (_event, requestId?: string) => {
    return abortClaudeCode(requestId);
  });
}
