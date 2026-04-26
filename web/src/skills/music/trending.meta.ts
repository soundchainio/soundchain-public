import type { SkillRegistryEntry } from 'types/AgentSkill'

export const trendingMeta: SkillRegistryEntry = {
  id: 'music.trending',
  category: 'music',
  name: 'trending',
  description: 'Returns hot tracks, trending stories, and rising artists.',
  httpMethod: 'GET',
  endpoint: '/api/agent/trending',
  auth: 'none',
  output: '{ hot_tracks: Track[], trending_stories: Story[], rising_artists: Artist[] }',
  example: 'GET /api/agent/trending',
}
