import { getHttpErrorMessage } from '../errors';
import {
  buildChatCompletionsUrl,
  withDefaultSystemMessage,
  withInitialResponseTimeout,
} from '../request';
import type { ChatConfig, ChatMessage, OnChunkCallback, OnDoneCallback } from '../types';

type DeepSeekThinkingType = 'enabled' | 'disabled';

interface DeepSeekRequestBody {
  model: string;
  messages: Array<{
    role: ChatMessage['role'];
    content: string;
  }>;
  stream: true;
  thinking?: {
    type: DeepSeekThinkingType;
  };
  reasoning_effort?: 'high' | 'max';
  stream_options?: {
    include_usage: boolean;
  };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

interface DeepSeekStreamChunk {
  choices?: Array<{
    delta?: {
      role?: 'assistant' | null;
      content?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'insufficient_system_resource' | null;
    index?: number;
  }>;
  usage?: unknown;
}

function getDeepSeekThinkingType(model: string): DeepSeekThinkingType {
  if (model.toLowerCase() === 'deepseek-chat') {
    return 'disabled';
  }
  return 'enabled';
}

export async function streamDeepSeek(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  signal: AbortSignal
): Promise<void> {
  const url = buildChatCompletionsUrl(config.baseUrl);
  const finalMessages = withDefaultSystemMessage(messages, config.systemPrompt);

  const thinkingType = getDeepSeekThinkingType(config.model);
  const requestBody: DeepSeekRequestBody = {
    model: config.model,
    messages: finalMessages.map((message) => ({ role: message.role, content: message.content })),
    stream: true,
    thinking: { type: thinkingType },
    stream_options: { include_usage: true },
  };
  if (thinkingType === 'enabled') {
    requestBody.reasoning_effort = 'high';
  }
  if (config.temperature !== undefined) {
    requestBody.temperature = config.temperature;
  }
  if (config.topP !== undefined) {
    requestBody.top_p = config.topP;
  }
  if (config.maxTokens !== undefined) {
    requestBody.max_tokens = config.maxTokens;
  }

  const timeout = withInitialResponseTimeout(signal);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: timeout.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError' && timeout.timedOut()) {
      throw new Error('请求超时，请检查网络或稍后重试');
    }
    throw err;
  } finally {
    timeout.cleanup();
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
        const parsed = JSON.parse(data) as DeepSeekStreamChunk;
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        // Skip malformed SSE JSON lines.
      }
    }
  }

  onDone(fullText);
}
