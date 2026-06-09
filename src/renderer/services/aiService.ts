// ============================================
// AI Service - Stream Chat with OpenAI-compatible APIs
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatConfig {
  modelId: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

export type OnChunkCallback = (chunk: string) => void;
export type OnDoneCallback = (fullText: string) => void;
export type OnErrorCallback = (error: Error) => void;

let abortController: AbortController | null = null;

/** Map HTTP status codes to user-friendly error messages */
function getHttpErrorMessage(status: number, body?: { error?: { message?: string } }): string {
  const serverMsg = body?.error?.message;
  switch (status) {
    case 401:
      return serverMsg || 'API Key 无效或已过期';
    case 403:
      return serverMsg || '无权访问该 API，请检查 API Key 权限';
    case 429:
      return serverMsg || '请求频率超限，请稍后重试';
    default:
      if (status >= 500) {
        return serverMsg || `服务端错误 (HTTP ${status})`;
      }
      return serverMsg || `HTTP ${status}`;
  }
}

/** Create an AbortSignal that times out after the given milliseconds */
function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Stream chat completion from an OpenAI-compatible API.
 * Supports OpenAI, Claude (via OpenAI-compat proxy), GLM, Kimi, DeepSeek, Qwen, etc.
 */
export async function streamChat(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  onError: OnErrorCallback
): Promise<void> {
  abortController = new AbortController();
  const { signal } = abortController;

  try {
    if (config.modelId === 'gemini-2-flash') {
      await streamGemini(messages, config, onChunk, onDone, onError, signal);
    } else if (config.modelId === 'claude-3-5-sonnet') {
      await streamClaude(messages, config, onChunk, onDone, onError, signal);
    } else {
      await streamOpenAICompatible(messages, config, onChunk, onDone, onError, signal);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      // User stopped generation — not an error
      return;
    }
    // Network errors
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
      onError(new Error('网络连接失败，请检查网络'));
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  } finally {
    abortController = null;
  }
}

/**
 * Stop the current generation.
 */
export function stopGeneration(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

// ============================================
// OpenAI-compatible streaming (SSE)
// ============================================

async function streamOpenAICompatible(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  _onError: OnErrorCallback,
  signal: AbortSignal
): Promise<void> {
  const url = config.baseUrl.endsWith('/')
    ? `${config.baseUrl}chat/completions`
    : `${config.baseUrl}/chat/completions`;

  // Ensure system message is present
  const finalMessages: ChatMessage[] = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system' as const, content: 'You are a helpful assistant.' }, ...messages];

  // Build request body — include thinking for DeepSeek V4 models
  const isDeepSeekV4 = config.model.startsWith('deepseek-v4');
  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: finalMessages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  };
  if (isDeepSeekV4) {
    requestBody.thinking = { type: 'enabled' };
    requestBody.reasoning_effort = 'high';
  }

  // Combine user abort signal with timeout
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS);
  const combinedController = new AbortController();
  const onAbort = () => combinedController.abort();
  signal.addEventListener('abort', onAbort);
  timeout.signal.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: combinedController.signal,
    });
  } catch (err: unknown) {
    timeout.clear();
    if (err instanceof Error && err.name === 'AbortError' && timeout.signal.aborted && !signal.aborted) {
      throw new Error('请求超时，请检查网络或稍后重试');
    }
    throw err;
  } finally {
    timeout.clear();
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(getHttpErrorMessage(res.status, errBody));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        onDone(fullText);
        return;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        // skip malformed JSON lines
      }
    }
  }

  onDone(fullText);
}

// ============================================
// Claude (Anthropic native API) streaming
// ============================================

async function streamClaude(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  _onError: OnErrorCallback,
  signal: AbortSignal
): Promise<void> {
  const url = `${config.baseUrl}/messages`;

  const claudeMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      messages: claudeMessages,
      max_tokens: 4096,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(getHttpErrorMessage(res.status, errBody));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(data) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
        if (parsed.type === 'message_stop') {
          onDone(fullText);
          return;
        }
      } catch {
        // skip
      }
    }
  }

  onDone(fullText);
}

// ============================================
// Google Gemini streaming
// ============================================

async function streamGemini(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  _onError: OnErrorCallback,
  signal: AbortSignal
): Promise<void> {
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const url = `${config.baseUrl}/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(getHttpErrorMessage(res.status, errBody));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(data) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // skip
      }
    }
  }

  onDone(fullText);
}

// ============================================
// Balance Query
// ============================================

export interface BalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface BalanceResponse {
  is_available: boolean;
  balance_infos: BalanceInfo[];
}

export async function queryBalance(baseUrl: string, apiKey: string): Promise<BalanceResponse> {
  const url = baseUrl.endsWith('/') ? `${baseUrl}user/balance` : `${baseUrl}/user/balance`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`查询余额失败: HTTP ${res.status}`);
  }
  return res.json();
}
