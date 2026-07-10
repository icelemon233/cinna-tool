export function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'chat.greeting.morning';
  if (hour < 14) return 'chat.greeting.noon';
  if (hour < 18) return 'chat.greeting.afternoon';
  return 'chat.greeting.evening';
}

export function estimateTokenCount(messages: Array<{ content: string }>): number {
  const text = messages.map((message) => message.content).join('\n');
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const nonCjkText = text.replace(/[\u4e00-\u9fff]/g, '');
  return cjkCount + Math.ceil(nonCjkText.length / 4);
}

export function displayConversationTitle(title: string, t: (key: string) => string): string {
  return title === '新对话' || title === 'New Chat' ? t('chat.defaultChatTitle') : title;
}
