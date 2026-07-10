import { isDeepSeekConfig } from './request';
import { queryBalance } from './balance';
import { streamClaude } from './providers/claude';
import { streamDeepSeek } from './providers/deepseek';
import { streamGemini } from './providers/gemini';
import { streamOpenAICompatible } from './providers/openAICompatible';
import type {
  ChatConfig,
  ChatMessage,
  OnChunkCallback,
  OnDoneCallback,
  OnErrorCallback,
} from './types';

let abortController: AbortController | null = null;

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
      await streamGemini(messages, config, onChunk, onDone, signal);
    } else if (config.modelId === 'claude-3-5-sonnet') {
      await streamClaude(messages, config, onChunk, onDone, signal);
    } else if (isDeepSeekConfig(config)) {
      await streamDeepSeek(messages, config, onChunk, onDone, signal);
    } else {
      await streamOpenAICompatible(messages, config, onChunk, onDone, signal);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
      onError(new Error('网络连接失败，请检查网络'));
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  } finally {
    abortController = null;
  }
}

export function stopGeneration(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

export { queryBalance };
export type { BalanceInfo, BalanceResponse } from './balance';
export type {
  ChatConfig,
  ChatMessage,
  OnChunkCallback,
  OnDoneCallback,
  OnErrorCallback,
} from './types';
