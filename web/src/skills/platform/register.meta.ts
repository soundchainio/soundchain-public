import type { SkillRegistryEntry } from 'types/AgentSkill'

export const registerMeta: SkillRegistryEntry = {
  id: 'platform.register',
  category: 'platform',
  name: 'register',
  description: 'Register an agent as a first-class SoundChain user (creates profile + user + agent record + HD wallet).',
  httpMethod: 'POST',
  endpoint: '/api/agent/register',
  auth: 'none',
  inputs: {
    agent_name: 'string (2–32 chars, normalized to a-z0-9_)',
    platform: 'string (default "openclaw")',
    bio: 'string (optional)',
    avatar_url: 'string (optional)',
    moltbook_id: 'string (optional)',
  },
  output: '{ agent: { agent_id, handle, polygon_address }, profile, airdrop, capabilities }',
  example: 'POST /api/agent/register { "agent_name": "myAgent", "platform": "openclaw" }',
}
