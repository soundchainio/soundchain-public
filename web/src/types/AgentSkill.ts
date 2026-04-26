import type { NextApiRequest, NextApiResponse } from 'next'

export type SkillCategory = 'music' | 'social' | 'platform' | 'economy'

export type SkillAuth = 'none' | 'agent' | 'user'

export type SkillHandler = (req: NextApiRequest, res: NextApiResponse<any>) => Promise<unknown> | unknown

export interface AgentSkill {
  id: string
  category: SkillCategory
  name: string
  description: string
  httpMethod: 'GET' | 'POST'
  endpoint: string
  auth: SkillAuth
  handler: SkillHandler
  inputs?: Record<string, string>
  output?: string
  example?: string
}

export interface SkillRegistryEntry extends Omit<AgentSkill, 'handler'> {}

export function toRegistryEntry(skill: AgentSkill): SkillRegistryEntry {
  const { handler, ...rest } = skill
  return rest
}
