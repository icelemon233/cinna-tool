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
  const url = `${config.baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`
    );
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`
    );
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`
    );
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
