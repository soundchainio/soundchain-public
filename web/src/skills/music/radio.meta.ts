import type { SkillRegistryEntry } from 'types/AgentSkill'

export const radioMeta: SkillRegistryEntry = {
  id: 'music.radio',
  category: 'music',
  name: 'radio',
  description: 'OGUN Radio: GET = current/random NFT track or playlist; POST = advance to next track. Queries Atlas directly.',
  httpMethod: 'GET',
  endpoint: '/api/agent/radio',
  auth: 'none',
  inputs: { action: '"playlist" (optional)', genre: 'genre key (optional)' },
  output: '{ now_playing, queue_length, available_genres, broadcast_message, ... }',
  example: 'GET /api/agent/radio?genre=lo_fi',
}
