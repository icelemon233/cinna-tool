import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type {
  ClaudeCodeConfig,
  ClaudeCodeDirectoryResult,
  ClaudeCodeEvent,
  ClaudeCodeFileContent,
  ClaudeCodeFileNode,
  ClaudeCodePermissionMode,
  ClaudeCodeStatus,
} from '@/shared/types/electron';
import './index.css';

type MessageRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface FileReference {
  id: string;
  path: string;
  name: string;
  mention: string;
  display: string;
}

const DEFAULT_CONFIG: ClaudeCodeConfig = {
  command: 'claude',
  projectPath: '',
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

const MODEL_OPTIONS = [
  { label: 'Sonnet', value: 'sonnet' },
  { label: 'Opus', value: 'opus' },
  { label: 'Haiku', value: 'haiku' },
  { label: 'Fable', value: 'fable' },
];

const PERMISSION_OPTIONS: Array<{ label: string; value: ClaudeCodePermissionMode }> = [
  { label: 'default', value: 'default' },
  { label: 'acceptEdits', value: 'acceptEdits' },
  { label: 'plan', value: 'plan' },
  { label: 'auto', value: 'auto' },
  { label: 'dontAsk', value: 'dontAsk' },
  { label: 'bypassPermissions', value: 'bypassPermissions' },
];

const QUICK_COMMANDS = ['/help', '/mcp', '/permissions', '/model', '/cost'];
const CODE_KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'interface',
  'let',
  'new',
  'null',
  'return',
  'switch',
  'throw',
  'true',
  'try',
  'type',
  'undefined',
  'while',
]);
const CODE_TOKEN_PATTERN = /(\/\/.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b|[{}()[\].,:;<>/=+\-*|&!?%])/g;

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function formatMention(filePath: string, projectPath: string): string {
  const normalizedFile = normalizePath(filePath);
  const normalizedProject = normalizePath(projectPath);
  const relative = normalizedFile.startsWith(`${normalizedProject}/`)
    ? normalizedFile.slice(normalizedProject.length + 1)
    : normalizedFile;
  const mention = relative.includes(' ') ? `@"${relative}"` : `@${relative}`;
  return mention;
}

function createFileReference(filePath: string, projectPath: string): FileReference {
  const name = basename(filePath);
  return {
    id: `${normalizePath(filePath)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    path: filePath,
    name,
    mention: formatMention(filePath, projectPath),
    display: `@${name}`,
  };
}

function appendText(current: string, addition: string): string {
  if (!current.trim()) return addition;
  return `${current.trimEnd()} ${addition}`;
}

function joinPromptParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' ');
}

function formatBytes(value?: number): string {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getPreviewLanguage(fileName = ''): string {
  const normalizedName = fileName.toLowerCase();
  if (normalizedName.endsWith('.tsx') || normalizedName.endsWith('.ts')) return 'typescript';
  if (normalizedName.endsWith('.jsx') || normalizedName.endsWith('.js') || normalizedName.endsWith('.mjs')) return 'javascript';
  if (normalizedName.endsWith('.json')) return 'json';
  if (normalizedName.endsWith('.css') || normalizedName.endsWith('.less')) return 'css';
  if (normalizedName.endsWith('.md') || normalizedName.endsWith('.mdx')) return 'markdown';
  if (normalizedName.endsWith('.html')) return 'html';
  return 'plain';
}

function getTokenClass(token: string, language: string): string {
  if (/^\/\//.test(token) || /^\/\*/.test(token)) return 'is-comment';
  if (/^['"`]/.test(token)) return 'is-string';
  if (/^\d/.test(token)) return 'is-number';
  if (language === 'json' && /^(true|false|null)$/.test(token)) return 'is-keyword';
  if (CODE_KEYWORDS.has(token)) return 'is-keyword';
  if (/^[{}()[\].,:;<>/=+\-*|&!?%]$/.test(token)) return 'is-punctuation';
  return 'is-plain';
}

function highlightCodeLine(line: string, language: string): React.ReactNode[] {
  if (!line) return [' '];

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  line.replace(CODE_TOKEN_PATTERN, (token, _match, offset: number) => {
    if (offset > cursor) {
      nodes.push(line.slice(cursor, offset));
    }
    nodes.push(
      <span className={`cc-code-token ${getTokenClass(token, language)}`} key={`${offset}-${token}`}>
        {token}
      </span>
    );
    cursor = offset + token.length;
    return token;
  });

  if (cursor < line.length) {
    nodes.push(line.slice(cursor));
  }

  return nodes;
}

function updateMessage(messages: ChatMessage[], id: string, patch: Partial<ChatMessage>) {
  return messages.map((message) => (message.id === id ? { ...message, ...patch } : message));
}

interface ProjectTreeProps {
  config: ClaudeCodeConfig;
  directories: Record<string, ClaudeCodeDirectoryResult>;
  expanded: Set<string>;
  filePreview: ClaudeCodeFileContent | null;
  loadingPath: string;
  onFileClick: (node: ClaudeCodeFileNode) => void;
  onFileDragStart: (event: React.DragEvent<HTMLButtonElement>, node: ClaudeCodeFileNode) => void;
  onLoadDirectory: (path: string) => void;
  onRefresh: () => void;
  onSelectProject: () => void;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function ProjectTree({
  config,
  directories,
  expanded,
  filePreview,
  loadingPath,
  onFileClick,
  onFileDragStart,
  onLoadDirectory,
  onRefresh,
  onSelectProject,
  setExpanded,
}: ProjectTreeProps) {
  const root = directories[config.projectPath];

  const toggleDirectory = (nodePath: string) => {
    const shouldLoad = !expanded.has(nodePath) && !directories[nodePath];
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodePath)) {
        next.delete(nodePath);
      } else {
        next.add(nodePath);
      }
      return next;
    });
    if (shouldLoad) onLoadDirectory(nodePath);
  };

  const renderNodes = (nodes: ClaudeCodeFileNode[], depth = 0): React.ReactNode => (
    nodes.map((node) => {
      const open = expanded.has(node.path);
      const childResult = directories[node.path];
      return (
        <React.Fragment key={node.path}>
          <button
            className={[
              'cc-tree-row',
              node.type === 'directory' ? 'is-directory' : '',
              filePreview?.path === node.path ? 'is-selected' : '',
            ].filter(Boolean).join(' ')}
            draggable={node.type === 'file'}
            onDragStart={(event) => {
              if (node.type === 'file') onFileDragStart(event, node);
            }}
            style={{ '--cc-depth': depth } as React.CSSProperties}
            onClick={() => (node.type === 'directory' ? toggleDirectory(node.path) : onFileClick(node))}
            type="button"
          >
            <span className={`cc-tree-caret${open ? ' is-open' : ''}`}>
              {node.type === 'directory' ? '›' : ''}
            </span>
            {node.type === 'directory' ? (
              open ? <FolderOpenOutlined /> : <FolderOutlined />
            ) : (
              <FileOutlined />
            )}
            <span className="cc-tree-name" title={node.relativePath}>{node.name}</span>
          </button>
          {node.type === 'directory' && open && (
            <div className="cc-tree-children">
              {loadingPath === node.path && <div className="cc-tree-loading">Loading...</div>}
              {childResult && renderNodes(childResult.nodes, depth + 1)}
              {childResult?.truncated && <div className="cc-tree-loading">Only first 300 entries shown</div>}
            </div>
          )}
        </React.Fragment>
      );
    })
  );

  return (
    <aside className="cc-project-panel">
      <div className="cc-project-header">
        <div className="cc-project-title">
          <CodeOutlined />
          <span title={config.projectPath}>{basename(config.projectPath) || 'Project'}</span>
        </div>
        <Space size={6}>
          <Tooltip title="选择项目">
            <Button icon={<FolderOpenOutlined />} onClick={onSelectProject} />
          </Tooltip>
          <Tooltip title="刷新目录">
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
          </Tooltip>
        </Space>
      </div>

      <div className="cc-project-path" title={config.projectPath}>{config.projectPath}</div>

      <div className="cc-tree">
        {root ? (
          <>
            <button
              className="cc-tree-row cc-tree-root is-directory"
              onClick={() => toggleDirectory(config.projectPath)}
              type="button"
            >
              <span className={`cc-tree-caret${expanded.has(config.projectPath) ? ' is-open' : ''}`}>›</span>
              <FolderOpenOutlined />
              <span className="cc-tree-name">{basename(config.projectPath).toUpperCase()}</span>
            </button>
            {expanded.has(config.projectPath) && renderNodes(root.nodes, 1)}
            {root.truncated && <div className="cc-tree-loading">Only first 300 entries shown</div>}
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择项目目录后显示文件树" />
        )}
      </div>
    </aside>
  );
}

interface FilePreviewPanelProps {
  filePreview: ClaudeCodeFileContent | null;
  loading: boolean;
  onClose: () => void;
}

function FilePreviewPanel({ filePreview, loading, onClose }: FilePreviewPanelProps) {
  const previewLines = useMemo(() => {
    if (!filePreview?.content) return [];
    return filePreview.content.split(/\r?\n/);
  }, [filePreview?.content]);
  const previewLanguage = useMemo(() => getPreviewLanguage(filePreview?.name), [filePreview?.name]);

  return (
    <aside className="cc-preview-panel">
      <div className="cc-preview-header">
        <div className="cc-preview-title-wrap">
          <span className="cc-preview-title">
            <FileOutlined />
            <span title={filePreview?.relativePath || ''}>
              {filePreview?.name || '文件预览'}
            </span>
          </span>
          <span className="cc-preview-path" title={filePreview?.relativePath || ''}>
            {filePreview?.relativePath || '单击左侧文件后在这里查看内容'}
          </span>
        </div>
        <Space size={6} wrap className="cc-preview-actions">
          {filePreview && <Tag>{formatBytes(filePreview.size)}</Tag>}
          {filePreview?.truncated && <Tag color="warning">预览前 220KB</Tag>}
          <Tooltip title="关闭预览">
            <Button
              aria-label="关闭预览"
              icon={<CloseOutlined />}
              onClick={onClose}
              type="text"
            />
          </Tooltip>
        </Space>
      </div>

      <div className="cc-preview-body">
        {loading ? (
          <div className="cc-preview-empty">Loading...</div>
        ) : filePreview ? (
          filePreview.binary ? (
            <div className="cc-preview-empty">二进制文件不可预览</div>
          ) : previewLines.length > 0 ? (
            <div className="cc-code-viewer">
              {previewLines.map((line, index) => (
                <div className="cc-code-line" key={index}>
                  <span className="cc-code-line-number">{index + 1}</span>
                  <code>{highlightCodeLine(line, previewLanguage)}</code>
                </div>
              ))}
              {filePreview.truncated && (
                <div className="cc-preview-more">仅展示文件前部分内容</div>
              )}
            </div>
          ) : (
            <div className="cc-preview-empty">空文件</div>
          )
        ) : (
          <div className="cc-preview-empty">单击左侧文件查看内容</div>
        )}
      </div>
    </aside>
  );
}

interface ConfigDrawerProps {
  config: ClaudeCodeConfig;
  open: boolean;
  onClose: () => void;
  onSave: (config: ClaudeCodeConfig) => void;
  onSelectMcp: () => Promise<string | null>;
  onSelectProject: () => Promise<string | null>;
}

function ConfigDrawer({
  config,
  open,
  onClose,
  onSave,
  onSelectMcp,
  onSelectProject,
}: ConfigDrawerProps) {
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    if (open) setDraft(config);
  }, [config, open]);

  const patchDraft = (partial: Partial<ClaudeCodeConfig>) => {
    setDraft((current) => ({ ...current, ...partial }));
  };

  return (
    <Drawer
      className="cc-config-drawer"
      title="Claude Code 配置"
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <div className="cc-config-form">
        <label>
          <span>命令</span>
          <Input value={draft.command} onChange={(event) => patchDraft({ command: event.target.value })} />
        </label>
        <label>
          <span>项目目录</span>
          <Input.Search
            enterButton={<FolderOpenOutlined />}
            value={draft.projectPath}
            onChange={(event) => patchDraft({ projectPath: event.target.value })}
            onSearch={async () => {
              const selected = await onSelectProject();
              if (selected) patchDraft({ projectPath: selected });
            }}
          />
        </label>
        <label>
          <span>模型</span>
          <Input
            placeholder="sonnet / opus / claude-sonnet-4-6"
            value={draft.model}
            onChange={(event) => patchDraft({ model: event.target.value })}
          />
        </label>
        <label>
          <span>权限模式</span>
          <Select
            value={draft.permissionMode}
            options={PERMISSION_OPTIONS}
            onChange={(permissionMode) => patchDraft({ permissionMode })}
          />
        </label>
        <div className="cc-config-section-title">认证与 API</div>
        <label>
          <span>Anthropic API Key</span>
          <Input.Password
            placeholder="可选；设置后会以 ANTHROPIC_API_KEY 启动 cc"
            value={draft.apiKey}
            onChange={(event) => patchDraft({ apiKey: event.target.value })}
          />
        </label>
        <label>
          <span>Bearer Token / 网关 Token</span>
          <Input.Password
            placeholder="可选；设置后会以 ANTHROPIC_AUTH_TOKEN 启动 cc"
            value={draft.authToken}
            onChange={(event) => patchDraft({ authToken: event.target.value })}
          />
        </label>
        <label>
          <span>Base URL</span>
          <Input
            placeholder="可选；例如 https://api.anthropic.com 或内部网关"
            value={draft.baseUrl}
            onChange={(event) => patchDraft({ baseUrl: event.target.value })}
          />
        </label>
        <div className="cc-config-section-title">模型别名映射</div>
        <label>
          <span>Sonnet alias</span>
          <Input
            placeholder="可选；ANTHROPIC_DEFAULT_SONNET_MODEL"
            value={draft.defaultSonnetModel}
            onChange={(event) => patchDraft({ defaultSonnetModel: event.target.value })}
          />
        </label>
        <label>
          <span>Opus alias</span>
          <Input
            placeholder="可选；ANTHROPIC_DEFAULT_OPUS_MODEL"
            value={draft.defaultOpusModel}
            onChange={(event) => patchDraft({ defaultOpusModel: event.target.value })}
          />
        </label>
        <label>
          <span>Haiku alias</span>
          <Input
            placeholder="可选；ANTHROPIC_DEFAULT_HAIKU_MODEL"
            value={draft.defaultHaikuModel}
            onChange={(event) => patchDraft({ defaultHaikuModel: event.target.value })}
          />
        </label>
        <label>
          <span>Fable alias</span>
          <Input
            placeholder="可选；ANTHROPIC_DEFAULT_FABLE_MODEL"
            value={draft.defaultFableModel}
            onChange={(event) => patchDraft({ defaultFableModel: event.target.value })}
          />
        </label>
        <label>
          <span>MCP 配置文件</span>
          <Input.Search
            enterButton={<ApiOutlined />}
            placeholder="./mcp.json"
            value={draft.mcpConfigPath}
            onChange={(event) => patchDraft({ mcpConfigPath: event.target.value })}
            onSearch={async () => {
              const selected = await onSelectMcp();
              if (selected) patchDraft({ mcpConfigPath: selected });
            }}
          />
        </label>
        <label>
          <span>额外目录（每行一个）</span>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 6 }}
            value={draft.additionalDirs.join('\n')}
            onChange={(event) => patchDraft({
              additionalDirs: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
            })}
          />
        </label>
        <label>
          <span>额外启动参数</span>
          <Input value={draft.extraArgs} onChange={(event) => patchDraft({ extraArgs: event.target.value })} />
        </label>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={() => onSave(draft)}
        >
          保存配置
        </Button>
      </div>
    </Drawer>
  );
}

function getStatusTag(status: ClaudeCodeStatus | null) {
  if (!status) return <Tag>未检查</Tag>;
  if (status.ok) return <Tag color="success" icon={<CheckCircleOutlined />}>已就绪</Tag>;
  return <Tag color="error">不可用</Tag>;
}

const ClaudeCodePage: React.FC = () => {
  const { message } = App.useApp();
  const [config, setConfig] = useState<ClaudeCodeConfig>(DEFAULT_CONFIG);
  const [directories, setDirectories] = useState<Record<string, ClaudeCodeDirectoryResult>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingPath, setLoadingPath] = useState('');
  const [filePreview, setFilePreview] = useState<ClaudeCodeFileContent | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [fileReferences, setFileReferences] = useState<FileReference[]>([]);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [runtimeMeta, setRuntimeMeta] = useState<{ model?: string; tools?: string[]; mcpServers?: string[] }>({});
  const activeRequestIdRef = useRef('');
  const activeAssistantIdRef = useRef('');
  const filePreviewRequestRef = useRef(0);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadDirectory = useCallback(async (directoryPath?: string) => {
    if (!window.electronAPI?.listClaudeCodeDirectory) return;
    const pathToLoad = directoryPath || config.projectPath;
    if (!pathToLoad) return;

    setLoadingPath(pathToLoad);
    try {
      const result = await window.electronAPI.listClaudeCodeDirectory(directoryPath);
      setDirectories((current) => ({ ...current, [result.path]: result }));
      setExpanded((current) => new Set(current).add(result.path));
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '目录读取失败');
    } finally {
      setLoadingPath('');
    }
  }, [config.projectPath, message]);

  const loadConfig = useCallback(async () => {
    const nextConfig = await window.electronAPI.getClaudeCodeConfig();
    setConfig(nextConfig);
    setExpanded(new Set([nextConfig.projectPath]));
    setDirectories({});
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config.projectPath) {
      loadDirectory(config.projectPath);
    }
  }, [config.projectPath, loadDirectory]);

  useEffect(() => {
    return window.electronAPI.onClaudeCodeEvent((event: ClaudeCodeEvent) => {
      if (activeRequestIdRef.current && event.requestId !== activeRequestIdRef.current) return;

      if (event.type === 'delta' && event.text) {
        const assistantId = activeAssistantIdRef.current;
        setMessages((current) => updateMessage(current, assistantId, {
          content: `${current.find((item) => item.id === assistantId)?.content || ''}${event.text}`,
        }));
      }

      if (event.type === 'stderr' && event.text) {
        if (/no stdin data received/i.test(event.text)) return;
        if (/No conversation found with session ID/i.test(event.text)) {
          setSessionId('');
        }
        setMessages((current) => [
          ...current,
          { id: createId(), role: 'system', content: event.text?.trim() || '' },
        ]);
      }

      if (event.type === 'meta') {
        if (event.sessionId) setSessionId(event.sessionId);
        setRuntimeMeta((current) => ({
          model: event.model || current.model,
          tools: event.tools?.length ? event.tools : current.tools,
          mcpServers: event.mcpServers?.length ? event.mcpServers : current.mcpServers,
        }));
      }

      if (event.type === 'error') {
        setMessages((current) => [
          ...current,
          { id: createId(), role: 'system', content: event.text || 'Claude Code 启动失败' },
        ]);
        setRunning(false);
      }

      if (event.type === 'exit') {
        if (event.code && event.code !== 0) {
          setSessionId('');
          setMessages((current) => [
            ...current,
            { id: createId(), role: 'system', content: `Claude Code 已退出，code=${event.code}` },
          ]);
        }
        activeRequestIdRef.current = '';
        activeAssistantIdRef.current = '';
        setRunning(false);
      }
    });
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectProject = async () => window.electronAPI.selectClaudeCodeProject();
  const selectMcp = async () => window.electronAPI.selectClaudeCodeMcpConfig();

  const saveConfig = async (nextConfig: ClaudeCodeConfig) => {
    const savedConfig = await window.electronAPI.saveClaudeCodeConfig(nextConfig);
    setConfig(savedConfig);
    setConfigOpen(false);
    setDirectories({});
    setExpanded(new Set([savedConfig.projectPath]));
    setFilePreview(null);
    setFileReferences([]);
    setSessionId('');
    message.success('Claude Code 配置已保存');
  };

  const checkStatus = async () => {
    const nextStatus = await window.electronAPI.getClaudeCodeStatus(config);
    setStatus(nextStatus);
    if (nextStatus.ok) {
      message.success('Claude Code 已就绪');
    } else {
      message.warning(nextStatus.error || 'Claude Code 不可用');
    }
  };

  const appendPrompt = (value: string) => {
    setPrompt((current) => appendText(current, value));
  };

  const appendSystemMessage = (content: string) => {
    setMessages((current) => [...current, { id: createId(), role: 'system', content }]);
  };

  const handleQuickCommand = (command: string) => {
    if (command === '/help') {
      appendSystemMessage('当前页面通过 Claude Code headless 模式运行。交互式 /help、/model、/permissions 等 slash command 不适合直接发送；请使用上方配置、模型和权限控件。');
      return;
    }

    if (command === '/model' || command === '/permissions' || command === '/mcp') {
      setConfigOpen(true);
      return;
    }

    if (command === '/cost') {
      appendSystemMessage('当前 headless 会话无法直接展示交互式 /cost 面板；如果需要成本统计，可以在终端交互式 cc 中查看，或后续接入单独的用量统计接口。');
      return;
    }

    appendPrompt(command);
  };

  const addFileReferences = useCallback((filePaths: string[]) => {
    const nextReferences = filePaths
      .map((filePath) => filePath.trim())
      .filter(Boolean)
      .map((filePath) => createFileReference(filePath, config.projectPath));

    if (nextReferences.length === 0) return;

    setFileReferences((current) => {
      const existingPaths = new Set(current.map((item) => normalizePath(item.path)));
      return [
        ...current,
        ...nextReferences.filter((item) => !existingPaths.has(normalizePath(item.path))),
      ];
    });
  }, [config.projectPath]);

  const removeFileReference = (id: string) => {
    setFileReferences((current) => current.filter((item) => item.id !== id));
  };

  const sendPrompt = async () => {
    const content = prompt.trim();
    const referenceMentions = fileReferences.map((item) => item.mention);
    const referenceDisplays = fileReferences.map((item) => item.display);
    const payloadContent = joinPromptParts([...referenceMentions, content]);
    const displayContent = joinPromptParts([...referenceDisplays, content]);

    if (!payloadContent || running) return;

    const userMessage: ChatMessage = { id: createId(), role: 'user', content: displayContent };
    const assistantMessage: ChatMessage = { id: createId(), role: 'assistant', content: '' };
    activeAssistantIdRef.current = assistantMessage.id;
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setPrompt('');
    setFileReferences([]);
    setRunning(true);

    try {
      const requestId = await window.electronAPI.runClaudeCode({
        prompt: payloadContent,
        sessionId: sessionId || undefined,
        config,
      });
      activeRequestIdRef.current = requestId;
    } catch (error) {
      setRunning(false);
      setMessages((current) => [
        ...current,
        { id: createId(), role: 'system', content: error instanceof Error ? error.message : String(error) },
      ]);
    }
  };

  const stopClaude = async () => {
    await window.electronAPI.abortClaudeCode(activeRequestIdRef.current || undefined);
    activeRequestIdRef.current = '';
    activeAssistantIdRef.current = '';
    setRunning(false);
  };

  const restartClaude = async () => {
    await stopClaude();
    setSessionId('');
    setRuntimeMeta({});
    setMessages((current) => [
      ...current,
      { id: createId(), role: 'system', content: '已重置 Claude Code 会话，下一条消息会启动新 session。' },
    ]);
  };

  const refreshProject = () => {
    setDirectories({});
    setExpanded(new Set([config.projectPath]));
    loadDirectory(config.projectPath);
  };

  const handleSelectProject = async () => {
    const selected = await selectProject();
    if (!selected) return;
    await saveConfig({ ...config, projectPath: selected });
  };

  const handleFilePreview = async (node: ClaudeCodeFileNode) => {
    if (node.type !== 'file') return;
    if (!window.electronAPI?.readClaudeCodeFile) {
      message.warning('文件预览不可用');
      return;
    }

    const requestId = filePreviewRequestRef.current + 1;
    filePreviewRequestRef.current = requestId;
    setFilePreviewLoading(true);
    try {
      const nextFilePreview = await window.electronAPI.readClaudeCodeFile(node.path);
      if (filePreviewRequestRef.current !== requestId) return;
      setFilePreview(nextFilePreview);
    } catch (error) {
      if (filePreviewRequestRef.current !== requestId) return;
      message.warning(error instanceof Error ? error.message : '文件读取失败');
    } finally {
      if (filePreviewRequestRef.current === requestId) {
        setFilePreviewLoading(false);
      }
    }
  };

  const closeFilePreview = () => {
    filePreviewRequestRef.current += 1;
    setFilePreview(null);
    setFilePreviewLoading(false);
  };

  const handleFileDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    node: ClaudeCodeFileNode
  ) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-cinnatool-cc-file', JSON.stringify({
      path: node.path,
      name: node.name,
      relativePath: node.relativePath,
    }));
    event.dataTransfer.setData('text/plain', node.path);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const internalPayload = event.dataTransfer.getData('application/x-cinnatool-cc-file');
    const files = Array.from(event.dataTransfer.files ?? []);
    const droppedPaths: string[] = [];

    if (internalPayload) {
      try {
        const parsed = JSON.parse(internalPayload) as { path?: string };
        if (parsed.path) droppedPaths.push(parsed.path);
      } catch {
        const textPath = event.dataTransfer.getData('text/plain');
        if (textPath) droppedPaths.push(textPath);
      }
    }

    droppedPaths.push(...files
      .map((file) => (file as File & { path?: string }).path || file.name)
      .filter(Boolean));

    if (droppedPaths.length === 0) return;

    event.preventDefault();
    addFileReferences(droppedPaths);
  };

  const renderedMessages = useMemo(() => messages.filter((item) => item.content || item.role !== 'assistant'), [messages]);
  const previewOpen = filePreviewLoading || Boolean(filePreview);

  return (
    <section className={`cc-page${previewOpen ? ' has-preview' : ''}`}>
      <main className="cc-main">
        <header className="cc-header">
          <div>
            <span className="cc-title-line">
              <CodeOutlined />
              <h1>Claude Code</h1>
            </span>
            <p>本地 cc 会话、项目上下文、MCP 和 Skill 快捷入口</p>
          </div>
          <Space wrap>
            {getStatusTag(status)}
            {sessionId && <Tag icon={<BranchesOutlined />}>{sessionId.slice(0, 8)}</Tag>}
            {runtimeMeta.model && <Tag color="blue">{runtimeMeta.model}</Tag>}
            {runtimeMeta.mcpServers?.length ? <Tag color="purple">MCP {runtimeMeta.mcpServers.length}</Tag> : null}
          </Space>
        </header>

        <div className="cc-toolbar">
          <Select
            className="cc-toolbar-select"
            value={config.model}
            options={MODEL_OPTIONS}
            onChange={(model) => saveConfig({ ...config, model })}
          />
          <Select
            className="cc-toolbar-select"
            value={config.permissionMode}
            options={PERMISSION_OPTIONS}
            onChange={(permissionMode) => saveConfig({ ...config, permissionMode })}
          />
          <Button icon={<PlayCircleOutlined />} onClick={checkStatus}>启动 / 检查</Button>
          <Button icon={<ReloadOutlined />} onClick={restartClaude}>重启 cc</Button>
          <Button icon={<SettingOutlined />} onClick={() => setConfigOpen(true)}>配置</Button>
          <Button danger disabled={!running} icon={<StopOutlined />} onClick={stopClaude}>停止</Button>
        </div>

        <div className="cc-chat-surface">
          {renderedMessages.length === 0 ? (
            <div className="cc-chat-empty">
              输入需求开始本地 Claude Code 会话；拖入文件会以 @文件名 显示，并以完整 @路径 发送。
            </div>
          ) : (
            renderedMessages.map((item) => (
              <div className={`cc-message is-${item.role}`} key={item.id}>
                <div className="cc-message-role">
                  {item.role === 'user' ? 'You' : item.role === 'assistant' ? 'CC' : 'System'}
                </div>
                <div className="cc-message-content">{item.content}</div>
              </div>
            ))
          )}
          {running && (
            <div className="cc-running-line">
              <ToolOutlined /> Claude Code 正在处理...
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        <div
          className="cc-input-panel"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="cc-quick-row">
            {QUICK_COMMANDS.map((command) => (
              <Button size="small" key={command} onClick={() => handleQuickCommand(command)}>
                {command}
              </Button>
            ))}
            <Button size="small" icon={<ApiOutlined />} onClick={() => appendPrompt('/mcp')}>
              MCP
            </Button>
            <Button size="small" icon={<ToolOutlined />} onClick={() => appendPrompt('/skill-name')}>
              Skill
            </Button>
          </div>
          {fileReferences.length > 0 && (
            <div className="cc-reference-row">
              {fileReferences.map((reference) => (
                <Tooltip title={reference.mention} key={reference.id}>
                  <Tag
                    className="cc-reference-tag"
                    closable
                    onClose={() => removeFileReference(reference.id)}
                  >
                    {reference.display}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          )}
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="输入 Claude Code 指令、自然语言需求，或拖入文件生成 @文件名 引用"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendPrompt();
              }
            }}
          />
          <div className="cc-input-footer">
            <Typography.Text type="secondary">
              {config.mcpConfigPath ? `MCP: ${config.mcpConfigPath}` : '未指定 MCP 配置；会使用 Claude Code 默认配置'}
            </Typography.Text>
            <Button type="primary" loading={running} onClick={sendPrompt}>
              发送
            </Button>
          </div>
        </div>
      </main>

      {previewOpen && (
        <FilePreviewPanel
          filePreview={filePreview}
          loading={filePreviewLoading}
          onClose={closeFilePreview}
        />
      )}

      <ProjectTree
        config={config}
        directories={directories}
        expanded={expanded}
        filePreview={filePreview}
        loadingPath={loadingPath}
        onFileClick={handleFilePreview}
        onFileDragStart={handleFileDragStart}
        onLoadDirectory={loadDirectory}
        onRefresh={refreshProject}
        onSelectProject={handleSelectProject}
        setExpanded={setExpanded}
      />

      <ConfigDrawer
        config={config}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={saveConfig}
        onSelectMcp={selectMcp}
        onSelectProject={selectProject}
      />
    </section>
  );
};

export default ClaudeCodePage;
