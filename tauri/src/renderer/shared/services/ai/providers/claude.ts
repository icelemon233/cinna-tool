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

  if (signal.aborted) return;
  const res = await window.cinnaAPI.httpRequest({
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      messages: claudeMessages,
      max_tokens: 4096,
      stream: true,
    }),
  });
  if (signal.aborted) return;

  if (!res.ok) {
    const errBody = JSON.parse(res.body || '{}') as { error?: { message?: string } };
    throw new Error(getHttpErrorMessage(res.status, errBody));
  }

  let fullText = '';

  for (const line of res.body.split('\n')) {
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

  onDone(fullText);
}
