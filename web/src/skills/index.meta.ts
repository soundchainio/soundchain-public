import type { SkillRegistryEntry, SkillCategory } from 'types/AgentSkill'
import { discoverMeta } from 'skills/music/discover.meta'
import { radioMeta } from 'skills/music/radio.meta'
import { trendingMeta } from 'skills/music/trending.meta'
import { composeMeta } from 'skills/music/compose.meta'
import { registerMeta } from 'skills/platform/register.meta'

export const SKILLS_META: SkillRegistryEntry[] = [
  discoverMeta,
  radioMeta,
  trendingMeta,
  composeMeta,
  registerMeta,
]

export function listMetaCategories(): SkillCategory[] {
  return Array.from(new Set(SKILLS_META.map(s => s.category)))
}
