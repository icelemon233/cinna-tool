import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { app, type WebContents } from 'electron';
import type {
  ClaudeCodeConfig,
  ClaudeCodeDirectoryResult,
  ClaudeCodeEvent,
  ClaudeCodeFileContent,
  ClaudeCodeFileNode,
  ClaudeCodeRunRequest,
  ClaudeCodeStatus,
} from '../types';

const MAX_DIRECTORY_ENTRIES = 300;
const MAX_FILE_PREVIEW_BYTES = 220 * 1024;
const CONFIG_KEY = 'claude-code-config';
const DEFAULT_IGNORED_DIRS = new Set(['.git', '.claude', '.DS_Store']);
const activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

function getDefaultProjectPath(): string {
  const cwd = process.cwd();
  if (fs.existsSync(cwd)) return cwd;
  return app.getPath('documents') || os.homedir();
}

export function getDefaultClaudeCodeConfig(): ClaudeCodeConfig {
  return {
    command: 'claude',
    projectPath: getDefaultProjectPath(),
    model: 'sonnet',
    permissionMode: 'default',
    apiKey: '',
    authToken: '',
    baseUrl: '',
    defaultSonnetModel: '',
    defaultOpusModel: '',
    defaultHaikuModel: '',
    defaultFableModel: '',
    mcpConfigPath: '',
    additionalDirs: [],
    extraArgs: '',
  };
}

function normalizeConfig(config: Partial<ClaudeCodeConfig> | null | undefined): ClaudeCodeConfig {
  const defaults = getDefaultClaudeCodeConfig();
  return {
    command: config?.command?.trim() || defaults.command,
    projectPath: config?.projectPath?.trim() || defaults.projectPath,
    model: config?.model?.trim() || defaults.model,
    permissionMode: config?.permissionMode || defaults.permissionMode,
    apiKey: config?.apiKey?.trim() || '',
    authToken: config?.authToken?.trim() || '',
    baseUrl: config?.baseUrl?.trim() || '',
    defaultSonnetModel: config?.defaultSonnetModel?.trim() || '',
    defaultOpusModel: config?.defaultOpusModel?.trim() || '',
    defaultHaikuModel: config?.defaultHaikuModel?.trim() || '',
    defaultFableModel: config?.defaultFableModel?.trim() || '',
    mcpConfigPath: config?.mcpConfigPath?.trim() || '',
    additionalDirs: Array.isArray(config?.additionalDirs)
      ? config.additionalDirs.map((item) => item.trim()).filter(Boolean)
      : [],
    extraArgs: config?.extraArgs?.trim() || '',
  };
}

export function readClaudeCodeConfig(loadValue: () => unknown): ClaudeCodeConfig {
  return normalizeConfig(loadValue() as Partial<ClaudeCodeConfig> | null);
}

export function getClaudeCodeConfigKey(): string {
  return CONFIG_KEY;
}

function isWithin(parentPath: string, targetPath: string): boolean {
  const parent = path.resolve(parentPath);
  const target = path.resolve(targetPath);
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

function createNode(projectPath: string, entryPath: string, entry: fs.Dirent): ClaudeCodeFileNode | null {
  if (DEFAULT_IGNORED_DIRS.has(entry.name)) return null;

  try {
    const stats = fs.statSync(entryPath);
    const isDirectory = entry.isDirectory();
    return {
      name: entry.name,
      path: entryPath,
      relativePath: path.relative(projectPath, entryPath) || entry.name,
      type: isDirectory ? 'directory' : 'file',
      hasChildren: isDirectory,
      size: stats.size,
      mtime: stats.mtimeMs,
    };
  } catch {
    return null;
  }
}

export function listClaudeCodeDirectory(
  config: ClaudeCodeConfig,
  targetPath?: string
): ClaudeCodeDirectoryResult {
  const projectPath = path.resolve(config.projectPath);
  const directoryPath = path.resolve(targetPath || projectPath);

  if (!isWithin(projectPath, directoryPath)) {
    throw new Error('目录不在当前项目内');
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const nodes = entries
    .map((entry) => createNode(projectPath, path.join(directoryPath, entry.name), entry))
    .filter((node): node is ClaudeCodeFileNode => Boolean(node))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

  return {
    path: directoryPath,
    relativePath: path.relative(projectPath, directoryPath),
    nodes: nodes.slice(0, MAX_DIRECTORY_ENTRIES),
    truncated: nodes.length > MAX_DIRECTORY_ENTRIES,
  };
}

function readFileHead(filePath: string, byteLength: number): Buffer {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(byteLength);
    const bytesRead = fs.readSync(fd, buffer, 0, byteLength, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

function isBinaryBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  return buffer.includes(0);
}

export function readClaudeCodeFile(
  config: ClaudeCodeConfig,
  filePath: string
): ClaudeCodeFileContent {
  const projectPath = path.resolve(config.projectPath);
  const resolvedFilePath = path.resolve(filePath);

  if (!isWithin(projectPath, resolvedFilePath)) {
    throw new Error('文件不在当前项目内');
  }

  const stats = fs.statSync(resolvedFilePath);
  if (!stats.isFile()) {
    throw new Error('只能预览文件内容');
  }

  const readLength = Math.min(stats.size, MAX_FILE_PREVIEW_BYTES);
  const buffer = readLength > 0 ? readFileHead(resolvedFilePath, readLength) : Buffer.alloc(0);
  const binary = isBinaryBuffer(buffer);

  return {
    name: path.basename(resolvedFilePath),
    path: resolvedFilePath,
    relativePath: path.relative(projectPath, resolvedFilePath),
    content: binary ? '' : buffer.toString('utf8'),
    size: stats.size,
    mtime: stats.mtimeMs,
    binary,
    truncated: stats.size > MAX_FILE_PREVIEW_BYTES,
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function splitArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | '' = '';
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = '';
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) args.push(current);
  return args;
}

function getShellCommand(command: string, args: string[]) {
  if (process.platform === 'win32') {
    return {
      command,
      args,
      options: { shell: true },
    };
  }

  return {
    command: '/bin/zsh',
    args: ['-lc', [command, ...args].map(shellQuote).join(' ')],
    options: { shell: false },
  };
}

function spawnClaudeProcess(
  command: string,
  args: string[],
  cwd: string,
  config?: ClaudeCodeConfig
): ChildProcessWithoutNullStreams {
  const shellCommand = getShellCommand(command, args);
  return spawn(shellCommand.command, shellCommand.args, {
    cwd,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
      ...(config?.apiKey ? { ANTHROPIC_API_KEY: config.apiKey } : {}),
      ...(config?.authToken ? { ANTHROPIC_AUTH_TOKEN: config.authToken } : {}),
      ...(config?.baseUrl ? { ANTHROPIC_BASE_URL: config.baseUrl } : {}),
      ...(config?.defaultSonnetModel ? { ANTHROPIC_DEFAULT_SONNET_MODEL: config.defaultSonnetModel } : {}),
      ...(config?.defaultOpusModel ? { ANTHROPIC_DEFAULT_OPUS_MODEL: config.defaultOpusModel } : {}),
      ...(config?.defaultHaikuModel ? { ANTHROPIC_DEFAULT_HAIKU_MODEL: config.defaultHaikuModel } : {}),
      ...(config?.defaultFableModel ? { ANTHROPIC_DEFAULT_FABLE_MODEL: config.defaultFableModel } : {}),
    },
    shell: shellCommand.options.shell,
  });
}

function runClaudeCommand(config: ClaudeCodeConfig, args: string[]): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const normalizedConfig = normalizeConfig(config);
    const child = spawnClaudeProcess(normalizedConfig.command, args, normalizedConfig.projectPath, normalizedConfig);
    let output = '';

    child.stdin.end();

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      output += error.message;
      resolve({ code: 1, output });
    });
    child.on('close', (code) => {
      resolve({ code, output: output.trim() });
    });
  });
}

export async function getClaudeCodeStatus(configInput: Partial<ClaudeCodeConfig>): Promise<ClaudeCodeStatus> {
  const config = normalizeConfig(configInput);

  try {
    const version = await runClaudeCommand(config, ['--version']);
    const auth = await runClaudeCommand(config, ['auth', 'status', '--text']);
    return {
      ok: version.code === 0,
      command: config.command,
      version: version.output,
      auth: auth.output,
      error: version.code === 0 ? '' : version.output,
    };
  } catch (error) {
    return {
      ok: false,
      command: config.command,
      version: '',
      auth: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildRunArgs(request: ClaudeCodeRunRequest): string[] {
  const config = normalizeConfig(request.config);
  const args = [
    '-p',
    request.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ];

  if (request.sessionId) args.push('--resume', request.sessionId);
  if (config.model) args.push('--model', config.model);
  if (config.permissionMode) args.push('--permission-mode', config.permissionMode);
  if (config.mcpConfigPath) args.push('--mcp-config', config.mcpConfigPath);
  config.additionalDirs.forEach((dir) => args.push('--add-dir', dir));
  if (config.extraArgs) args.push(...splitArgs(config.extraArgs));

  return args;
}

function sendEvent(webContents: WebContents, event: ClaudeCodeEvent): void {
  if (webContents.isDestroyed()) return;
  webContents.send('cc:event', event);
}

function extractTextFromEvent(payload: Record<string, unknown>): string {
  const event = payload.event as Record<string, unknown> | undefined;
  const delta = event?.delta as Record<string, unknown> | undefined;
  if (typeof delta?.text === 'string') return delta.text;

  if (typeof payload.result === 'string') return payload.result;
  if (typeof payload.text === 'string') return payload.text;

  const message = payload.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item && typeof item === 'object' && 'text' in item) {
          return String((item as { text?: unknown }).text ?? '');
        }
        return '';
      })
      .join('');
  }

  return '';
}

function parseListValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name?: unknown }).name ?? '');
      }
      return '';
    })
    .filter(Boolean);
}

function handleJsonLine(
  webContents: WebContents,
  requestId: string,
  line: string
): void {
  try {
    const payload = JSON.parse(line) as Record<string, unknown>;
    const text = extractTextFromEvent(payload);
    if (text) {
      sendEvent(webContents, { requestId, type: 'delta', text });
    }

    const sessionId = typeof payload.session_id === 'string'
      ? payload.session_id
      : typeof payload.sessionId === 'string'
        ? payload.sessionId
        : undefined;
    const model = typeof payload.model === 'string' ? payload.model : undefined;
    const tools = parseListValue(payload.tools);
    const mcpServers = parseListValue(payload.mcp_servers ?? payload.mcpServers);

    if (sessionId || model || tools.length > 0 || mcpServers.length > 0) {
      sendEvent(webContents, {
        requestId,
        type: 'meta',
        sessionId,
        model,
        tools,
        mcpServers,
      });
    }
  } catch {
    sendEvent(webContents, { requestId, type: 'delta', text: line });
  }
}

export function runClaudeCode(
  request: ClaudeCodeRunRequest,
  webContents: WebContents
): string {
  const config = normalizeConfig(request.config);
  const requestId = randomUUID();
  const child = spawnClaudeProcess(config.command, buildRunArgs(request), config.projectPath, config);
  activeProcesses.set(requestId, child);

  let stdoutBuffer = '';
  sendEvent(webContents, { requestId, type: 'start' });
  child.stdin.end();

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf8');
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? '';
    lines.filter(Boolean).forEach((line) => handleJsonLine(webContents, requestId, line));
  });

  child.stderr.on('data', (chunk: Buffer) => {
    sendEvent(webContents, { requestId, type: 'stderr', text: chunk.toString('utf8') });
  });

  child.on('error', (error) => {
    sendEvent(webContents, { requestId, type: 'error', text: error.message });
  });

  child.on('close', (code, signal) => {
    if (stdoutBuffer.trim()) {
      handleJsonLine(webContents, requestId, stdoutBuffer.trim());
      stdoutBuffer = '';
    }
    activeProcesses.delete(requestId);
    sendEvent(webContents, { requestId, type: 'exit', code, signal });
  });

  return requestId;
}

export function abortClaudeCode(requestId?: string): boolean {
  if (requestId) {
    const processToKill = activeProcesses.get(requestId);
    if (!processToKill) return false;
    processToKill.kill();
    activeProcesses.delete(requestId);
    return true;
  }

  activeProcesses.forEach((processToKill) => processToKill.kill());
  activeProcesses.clear();
  return true;
}
