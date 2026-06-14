import { getHttpErrorMessage } from '../errors';
import type { ChatConfig, ChatMessage, OnChunkCallback, OnDoneCallback } from '../types';

export async function streamClaude(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  signal: AbortSignal
): Promise<void> {
  const url = `${config.baseUrl}/messages`;

  const claudeMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
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
        // Skip malformed SSE JSON lines.
      }
    }
  }

  onDone(fullText);
}
