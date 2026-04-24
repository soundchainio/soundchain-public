/**
 * Fantasy graphics palette — NFL team primary colors + position color codes.
 * Static so we don't round-trip to ESPN on every render; fetchNFLTeams() in
 * espn.ts can enrich this at runtime if we want logos/alternate colors too.
 */

/** NFL team primary brand color (hex without leading #). Keyed by ESPN abbr. */
export const NFL_TEAM_COLORS: Record<string, string> = {
  ARI: '97233F', ATL: 'A71930', BAL: '241773', BUF: '00338D',
  CAR: '0085CA', CHI: '0B162A', CIN: 'FB4F14', CLE: '311D00',
  DAL: '003594', DEN: 'FB4F14', DET: '0076B6', GB:  '203731',
  HOU: '03202F', IND: '002C5F', JAX: '006778', KC:  'E31837',
  LAC: '0080C6', LAR: '003594', LV:  '000000', MIA: '008E97',
  MIN: '4F2683', NE:  '002244', NO:  'D3BC8D', NYG: '0B2265',
  NYJ: '125740', PHI: '004C54', PIT: 'FFB612', SEA: '002244',
  SF:  'AA0000', TB:  'D50A0A', TEN: '0C2340', WAS: '5A1414',
}

export function teamColorHex(teamAbbr?: string): string {
  if (!teamAbbr) return '555555'
  return NFL_TEAM_COLORS[teamAbbr.toUpperCase()] || '555555'
}

/** Position → Tailwind class bundle for background + text + ring. */
export const POSITION_PILL: Record<string, string> = {
  QB:    'bg-red-500/20 text-red-300 ring-red-500/40',
  RB:    'bg-green-500/20 text-green-300 ring-green-500/40',
  WR:    'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  TE:    'bg-orange-500/20 text-orange-300 ring-orange-500/40',
  K:     'bg-purple-500/20 text-purple-300 ring-purple-500/40',
  DST:   'bg-zinc-500/20 text-zinc-300 ring-zinc-500/40',
  DEF:   'bg-zinc-500/20 text-zinc-300 ring-zinc-500/40',
  FLEX:  'bg-cyan-500/20 text-cyan-300 ring-cyan-500/40',
  BENCH: 'bg-gray-600/20 text-gray-400 ring-gray-600/40',
}

export function positionPillClass(position?: string): string {
  if (!position) return POSITION_PILL.BENCH
  return POSITION_PILL[position.toUpperCase()] || POSITION_PILL.BENCH
}
