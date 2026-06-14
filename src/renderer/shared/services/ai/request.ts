import type { ChatConfig, ChatMessage } from './types';

const REQUEST_TIMEOUT_MS = 30_000;

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

export function isDeepSeekConfig(config: ChatConfig): boolean {
  const model = config.model.toLowerCase();
  const baseUrl = config.baseUrl.toLowerCase();
  return model.startsWith('deepseek-') || baseUrl.includes('api.deepseek.com');
}

export function withDefaultSystemMessage(
  messages: ChatMessage[],
  systemPrompt?: string
): ChatMessage[] {
  const prompt = systemPrompt?.trim() || 'You are a helpful assistant.';
  return messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: prompt }, ...messages];
}

export function withInitialResponseTimeout(signal: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
} {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS);
  const combinedController = new AbortController();
  const onAbort = () => combinedController.abort();

  signal.addEventListener('abort', onAbort);
  timeout.signal.addEventListener('abort', onAbort);

  return {
    signal: combinedController.signal,
    cleanup: () => {
      signal.removeEventListener('abort', onAbort);
      timeout.signal.removeEventListener('abort', onAbort);
      timeout.clear();
    },
    timedOut: () => timeout.signal.aborted && !signal.aborted,
  };
}
