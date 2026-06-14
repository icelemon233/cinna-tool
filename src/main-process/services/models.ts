import type { ModelInfo } from '../types';

export function getModelList(): ModelInfo[] {
  return [
    {
      id: 'gpt-4o',
      name: 'ChatGPT (OpenAI)',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      requiresUrl: false,
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude (Anthropic)',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-20241022',
      requiresUrl: false,
    },
    {
      id: 'gemini-2-flash',
      name: 'Gemini (Google)',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash',
      requiresUrl: false,
    },
    {
      id: 'glm-4-flash',
      name: 'GLM (智谱AI)',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
      requiresUrl: false,
    },
    {
      id: 'kimi-plus',
      name: 'Kimi (Moonshot)',
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      requiresUrl: false,
    },
    {
      id: 'deepseek-v4-pro',
      name: 'DeepSeek V4-Pro',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
      requiresUrl: false,
    },
    {
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4-Flash',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
      requiresUrl: false,
    },
    {
      id: 'qwen-plus',
      name: '通义千问 (阿里云)',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
      requiresUrl: false,
    },
    {
      id: 'custom',
      name: '自定义 (OpenAI 兼容接口)',
      baseUrl: '',
      model: '',
      requiresUrl: true,
    },
  ];
}
