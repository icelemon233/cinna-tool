import { getHttpErrorMessage } from '../errors';
import { buildChatCompletionsUrl, withDefaultSystemMessage } from '../request';
import type { ChatConfig, ChatMessage, OnChunkCallback, OnDoneCallback } from '../types';

export async function streamOpenAICompatible(
  messages: ChatMessage[],
  config: ChatConfig,
  onChunk: OnChunkCallback,
  onDone: OnDoneCallback,
  signal: AbortSignal
): Promise<void> {
  const url = buildChatCompletionsUrl(config.baseUrl);
  const finalMessages = withDefaultSystemMessage(messages, config.systemPrompt);

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: finalMessages.map((message) => ({ role: message.role, content: message.content })),
    stream: true,
  };
  if (config.temperature !== undefined) {
    requestBody.temperature = config.temperature;
  }
  if (config.topP !== undefined) {
    requestBody.top_p = config.topP;
  }
  if (config.maxTokens !== undefined) {
    requestBody.max_tokens = config.maxTokens;
  }

  if (signal.aborted) return;
  const res = await window.cinnaAPI.httpRequest({
    url,
    method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    body: JSON.stringify(requestBody),
  });
  if (signal.aborted) return;

  if (!res.ok) {
    const errBody = JSON.parse(res.body || '{}') as { error?: { message?: string } };
    throw new Error(getHttpErrorMessage(res.status, errBody));
  }

  let fullText = '';

  for (const line of res.body.split('\n')) {
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
        // Skip malformed SSE JSON lines.
      }
  }

  onDone(fullText);
}
