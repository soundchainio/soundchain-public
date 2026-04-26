import type { SkillRegistryEntry } from 'types/AgentSkill'

export const discoverMeta: SkillRegistryEntry = {
  id: 'music.discover',
  category: 'music',
  name: 'discover',
  description: 'Returns shuffled tracks, posts, and artists for serendipitous music discovery.',
  httpMethod: 'GET',
  endpoint: '/api/agent/discover',
  auth: 'none',
  inputs: { limit: 'number (1–50, default 30)' },
  output: '{ discoveries: Array<track|post|artist>, spotlight: object|null }',
  example: 'GET /api/agent/discover?limit=20',
}
