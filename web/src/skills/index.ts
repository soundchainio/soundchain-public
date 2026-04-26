import type { AgentSkill, SkillCategory, SkillRegistryEntry } from 'types/AgentSkill'
import { toRegistryEntry } from 'types/AgentSkill'
import { discoverSkill } from 'skills/music/discover'
import { radioSkill } from 'skills/music/radio'
import { trendingSkill } from 'skills/music/trending'
import { composeSkill } from 'skills/music/compose'
import { registerSkill } from 'skills/platform/register'

export const SKILLS: AgentSkill[] = [
  discoverSkill,
  radioSkill,
  trendingSkill,
  composeSkill,
  registerSkill,
]

export function getSkill(id: string): AgentSkill | undefined {
  return SKILLS.find(s => s.id === id)
}

export function getSkillsByCategory(category: SkillCategory): AgentSkill[] {
  return SKILLS.filter(s => s.category === category)
}

export function listCategories(): SkillCategory[] {
  return Array.from(new Set(SKILLS.map(s => s.category)))
}

export function registry(): SkillRegistryEntry[] {
  return SKILLS.map(toRegistryEntry)
}
