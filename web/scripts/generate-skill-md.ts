import * as fs from 'fs'
import * as path from 'path'
import { SKILLS_META as SKILLS, listMetaCategories as listCategories } from 'skills/index.meta'

const HEADER = `# SoundChain Agent Skills

Auto-generated from \`web/src/skills/\`. Do not edit by hand — run \`yarn generate:skills\` from \`web/\`.

SoundChain exposes a typed skill registry that AI agents can discover and call. Each skill is a single named capability with a stable HTTP endpoint, JSON inputs, and JSON outputs.

- **Live registry (JSON):** \`GET https://soundchain.io/api/agent/skills\`
- **Source of truth:** \`web/src/skills/index.ts\`
- **Convention:** \`<category>.<name>\` (e.g. \`music.discover\`)
`

function row(label: string, value: string): string {
  return `- **${label}:** ${value}`
}

function renderInputs(inputs?: Record<string, string>): string {
  if (!inputs || Object.keys(inputs).length === 0) return '- **Inputs:** _(none)_'
  const lines = Object.entries(inputs).map(([k, v]) => `  - \`${k}\` — ${v}`)
  return `- **Inputs:**\n${lines.join('\n')}`
}

function renderSkillSection(skill: typeof SKILLS[number]): string {
  const lines: string[] = []
  lines.push(`### \`${skill.id}\``)
  lines.push('')
  lines.push(skill.description)
  lines.push('')
  lines.push(row('Endpoint', `\`${skill.httpMethod} ${skill.endpoint}\``))
  lines.push(row('Auth', skill.auth))
  lines.push(renderInputs(skill.inputs))
  if (skill.output) lines.push(row('Output', skill.output))
  if (skill.example) lines.push(row('Example', `\`${skill.example}\``))
  lines.push('')
  return lines.join('\n')
}

function renderToc(): string {
  const cats = listCategories()
  const items = cats.map(c => `- [${c}](#${c})`)
  return `## Categories\n\n${items.join('\n')}\n`
}

function renderCategories(): string {
  const out: string[] = []
  for (const cat of listCategories()) {
    out.push(`## ${cat}`)
    out.push('')
    const skills = SKILLS.filter(s => s.category === cat)
    for (const skill of skills) {
      out.push(renderSkillSection(skill))
    }
  }
  return out.join('\n')
}

function renderFooter(): string {
  return `---

## Discovery

Agents can fetch the live registry at \`/api/agent/skills\`:

\`\`\`bash
curl https://soundchain.io/api/agent/skills | jq '.data.skills[].id'
\`\`\`

Skill metadata is stable; handler implementations may evolve. Endpoints listed here remain canonical even after refactors — they delegate to the skill registry under the hood.

_Generated ${new Date().toISOString()} — ${SKILLS.length} skill${SKILLS.length === 1 ? '' : 's'} across ${listCategories().length} categor${listCategories().length === 1 ? 'y' : 'ies'}._
`
}

function main() {
  const md = [
    HEADER,
    renderToc(),
    renderCategories(),
    renderFooter(),
  ].join('\n')

  const outPath = path.resolve(__dirname, '..', 'public', 'skill.md')
  fs.writeFileSync(outPath, md, 'utf8')
  // eslint-disable-next-line no-console
  console.log(`[generate:skills] wrote ${SKILLS.length} skills → ${outPath}`)
}

main()
