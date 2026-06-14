import { generateId } from './ids';
import type { ChatSkill } from './types';

export function createSkill(
  skillInput: Pick<ChatSkill, 'name' | 'description' | 'instructions'>
): ChatSkill | null {
  const now = Date.now();
  const skill: ChatSkill = {
    id: generateId(),
    name: skillInput.name.trim(),
    description: skillInput.description.trim(),
    instructions: skillInput.instructions.trim(),
    enabled: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return skill.name && skill.instructions ? skill : null;
}

export function updateSkillRecord(
  skill: ChatSkill,
  partial: Partial<Pick<ChatSkill, 'name' | 'description' | 'instructions' | 'enabled'>>
): ChatSkill {
  return {
    ...skill,
    ...partial,
    name: partial.name !== undefined ? partial.name.trim() : skill.name,
    description:
      partial.description !== undefined
        ? partial.description.trim()
        : skill.description,
    instructions:
      partial.instructions !== undefined
        ? partial.instructions.trim()
        : skill.instructions,
    updatedAt: Date.now(),
  };
}

export function touchEnabledSkills(skills: ChatSkill[]): ChatSkill[] {
  const enabledSkillIds = skills.filter((skill) => skill.enabled).map((skill) => skill.id);
  if (enabledSkillIds.length === 0) return skills;

  const now = Date.now();
  return skills.map((skill) =>
    enabledSkillIds.includes(skill.id)
      ? {
          ...skill,
          usageCount: skill.usageCount + 1,
          lastUsedAt: now,
          updatedAt: now,
        }
      : skill
  );
}
