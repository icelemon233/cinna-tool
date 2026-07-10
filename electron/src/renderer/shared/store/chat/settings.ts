import type { ChatConfig } from '@/shared/services/aiService';
import type { ModelInfo } from '@/shared/types/electron.d';
import type { ChatSettings, ChatSkill } from './types';

export const defaultSettings: ChatSettings = {
  modelId: '',
  model: '',
  baseUrl: '',
  apiKey: '',
  chatName: '',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 4096,
};

export function normalizeSettings(
  settings: ChatSettings,
  models: ModelInfo[]
): ChatSettings {
  const mergedSettings = { ...defaultSettings, ...settings };
  const selectedModel =
    models.find((model) => model.id === mergedSettings.modelId) ||
    (
      mergedSettings.modelId === 'deepseek-chat' ||
      mergedSettings.modelId === 'deepseek-v4-pro' ||
      mergedSettings.model === 'deepseek-chat'
        ? models.find((model) => model.id === 'deepseek-v4-pro')
        : undefined
    );
  if (!selectedModel || selectedModel.requiresUrl) {
    return mergedSettings;
  }

  return {
    ...mergedSettings,
    modelId: selectedModel.id,
    baseUrl: selectedModel.baseUrl,
    model: selectedModel.model,
  };
}

function buildSkillSystemPrompt(systemPrompt: string, skills: ChatSkill[]): string {
  const enabledSkills = skills.filter((skill) => skill.enabled);
  const basePrompt = systemPrompt.trim() || defaultSettings.systemPrompt;

  if (enabledSkills.length === 0) {
    return basePrompt;
  }

  const skillPrompt = enabledSkills
    .map((skill, index) => {
      const description = skill.description.trim();
      const instructions = skill.instructions.trim();
      return [
        `${index + 1}. ${skill.name.trim()}`,
        description ? `Description: ${description}` : '',
        instructions ? `Instructions: ${instructions}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  return `${basePrompt}\n\nEnabled skills for this chat:\n${skillPrompt}\n\nUse these skills when they are relevant to the user's request. If you rely on a skill, mention the skill name briefly in your answer.`;
}

export function getEffectiveChatConfig(
  settings: ChatSettings,
  models: ModelInfo[],
  skills: ChatSkill[]
): ChatConfig {
  const normalized = normalizeSettings(settings, models);
  return {
    modelId: normalized.modelId,
    model: normalized.model,
    baseUrl: normalized.baseUrl,
    apiKey: normalized.apiKey,
    systemPrompt: buildSkillSystemPrompt(normalized.systemPrompt, skills),
    temperature: normalized.temperature,
    topP: normalized.topP,
    maxTokens: normalized.maxTokens,
  };
}
