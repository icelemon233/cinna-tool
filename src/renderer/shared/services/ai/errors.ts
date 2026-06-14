export function getHttpErrorMessage(
  status: number,
  body?: { error?: { message?: string } }
): string {
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
