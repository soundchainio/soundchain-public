/**
 * stats.nba.com client — TS port of the URL surface that the python `nba_api`
 * library wraps. Pure HTTP. No auth, but stats.nba.com 403s without the
 * x-nba-stats-token + Referer + Origin headers — they're load-bearing, do not
 * strip them as "unused."
 *
 * Endpoints in scope for the nba.com-clone box-score modal:
 *   BoxScoreTraditionalV3   pts/reb/ast/stl/blk/to/fg%/3p%/ft%/+/-
 *   BoxScoreAdvancedV3      OffRtg/DefRtg/NetRtg/USG%/eFG%/TS%/Pace/PIE
 *   BoxScoreTrackingV3      speed, distance, touches, drives, paint touches
 *   BoxScoreHustleV2        deflections, contested shots, screen assists, charges, loose balls
 *   BoxScoreDefensiveV2     def matchup time, partial poss, def fga, def fgm
 *   BoxScoreMatchupsV3      player-on-player matchup splits
 *   ShotChartDetail         shot coordinates + zones (per game)
 *   ScoreboardV3            schedule by date — used to map ESPN gameIds → nba.com gameIds
 *
 * All fetches are server-side (Next.js API routes). Client never touches
 * stats.nba.com directly — Capacitor WebView would CORS-fail anyway, and the
 * server-side proxy makes the native app port zero-change.
 */

const STATS_BASE = 'https://stats.nba.com/stats'

// Headers — stats.nba.com 403s without these. The token + origin are
// what gates "browsing the site" vs "scraping with a script." These exact
// values are what the nba.com web app sends.
const STATS_HEADERS: Record<string, string> = {
  Host: 'stats.nba.com',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
  Connection: 'keep-alive',
  'x-nba-stats-token': 'true',
  'x-nba-stats-origin': 'stats',
}

// Default V3 boxscore params — every BoxScoreXxxV3 endpoint takes the same
// "whole game, all minutes" rangeType=0 set. Pulled out so we don't re-author
// it per endpoint.
const V3_BOX_PARAMS = {
  LeagueID: '00', // 00 = NBA, 10 = WNBA, 20 = G-League
  endPeriod: '0',
  endRange: '28800',
  rangeType: '0',
  startPeriod: '0',
  startRange: '0',
} as const

async function nbaGet(endpoint: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString()
  const url = `${STATS_BASE}/${endpoint}?${qs}`
  const res = await fetch(url, {
    headers: STATS_HEADERS,
    // 12s upper bound — stats.nba.com is usually <500ms but goes flaky during
    // tip-off windows when every client in the world is polling at once.
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    throw new Error(`stats.nba.com ${endpoint} → HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Player + team shapes (V3 unified) ──────────────────────────────────────

export interface NbaPlayer {
  personId: number
  firstName: string
  familyName: string
  nameI: string                  // "L. James"
  playerSlug: string
  position: string               // "F" / "G" / "C" / "F-C" / ""
  comment: string                // "DNP - Coach's Decision" if benched
  jerseyNum: string
  minutes: string                // "MM:SS" — empty string if DNP
  statistics: Record<string, number | string>
}

export interface NbaTeamSide {
  teamId: number
  teamCity: string
  teamName: string
  teamTricode: string            // "BOS" / "LAL"
  teamSlug: string
  players: NbaPlayer[]
  statistics: Record<string, number | string>
}

export interface NbaBoxScoreV3 {
  gameId: string
  awayTeamId: number
  homeTeamId: number
  homeTeam: NbaTeamSide
  awayTeam: NbaTeamSide
}

// ─── Endpoint wrappers ──────────────────────────────────────────────────────

/** Traditional box score: pts/reb/ast/stl/blk/to/fg%/3p%/ft%/+/-. The headline "what
 *  did this player do" tab. Updates live during the game. */
export async function fetchBoxScoreTraditional(gameId: string): Promise<NbaBoxScoreV3> {
  const data = await nbaGet('boxscoretraditionalv3', { GameID: gameId, ...V3_BOX_PARAMS })
  return shapeBoxScore(data?.boxScoreTraditional, gameId)
}

/** Advanced: OffRtg/DefRtg/NetRtg/USG%/eFG%/TS%/Pace/PIE. Built on top of
 *  traditional + possession counts — the "how efficient" view. Updates live. */
export async function fetchBoxScoreAdvanced(gameId: string): Promise<NbaBoxScoreV3> {
  const data = await nbaGet('boxscoreadvancedv3', { GameID: gameId, ...V3_BOX_PARAMS })
  return shapeBoxScore(data?.boxScoreAdvanced, gameId)
}

/** Tracking: speed, distance, touches, drives, paint touches, post-ups,
 *  elbow touches. Lower update cadence — refreshes ~every 60-90s during the
 *  game, fully populated post-final. */
export async function fetchBoxScoreTracking(gameId: string): Promise<NbaBoxScoreV3> {
  const data = await nbaGet('boxscoreplayertrackv3', { GameID: gameId, ...V3_BOX_PARAMS })
  return shapeBoxScore(data?.boxScorePlayerTrack, gameId)
}

/** Hustle: deflections, contested shots, screen assists, charges drawn, loose
 *  balls recovered, box-outs. The "blue collar" stats. Updates live. */
export async function fetchBoxScoreHustle(gameId: string): Promise<NbaBoxScoreV3> {
  // Hustle is V2, not V3 — different param set. No rangeType.
  const data = await nbaGet('hustlestatsboxscore', { GameID: gameId })
  // V2 returns resultSets (array) instead of named sections — shape it back to
  // the unified V3 shape so the frontend doesn't branch by version.
  return shapeHustleV2(data, gameId)
}

/** Defensive matchups (V2): def matchup time, partial poss, def fga, def fgm.
 *  Coarser than the matchups tab but fully populated for every game. */
export async function fetchBoxScoreDefensive(gameId: string): Promise<NbaBoxScoreV3> {
  const data = await nbaGet('boxscoredefensivev2', { GameID: gameId, ...V3_BOX_PARAMS })
  return shapeBoxScore(data?.boxScoreDefensive, gameId)
}

export interface NbaMatchupRow {
  offensivePlayerId: number
  offensivePlayerName: string
  defensivePlayerId: number
  defensivePlayerName: string
  matchupMinutes: string
  partialPossessions: number
  playerPoints: number
  teamPoints: number
  matchupAssists: number
  matchupTurnovers: number
  matchupFieldGoalsMade: number
  matchupFieldGoalsAttempted: number
  matchupThreePointersMade: number
  matchupThreePointersAttempted: number
  matchupFreeThrowsMade: number
  matchupFreeThrowsAttempted: number
  shootingFouls: number
  blocks: number
}

export interface NbaMatchups {
  gameId: string
  rows: NbaMatchupRow[]
}

/** Player-on-player matchup splits (V3): defender X spent N min on attacker Y,
 *  Y scored P points / Q assists / R turnovers in that span. Sparse — only
 *  populated for select games and post-final for most. */
export async function fetchBoxScoreMatchups(gameId: string): Promise<NbaMatchups> {
  const data = await nbaGet('boxscorematchupsv3', { GameID: gameId, ...V3_BOX_PARAMS })
  const teams = [data?.boxScoreMatchups?.homeTeam, data?.boxScoreMatchups?.awayTeam].filter(Boolean)
  const rows: NbaMatchupRow[] = []
  for (const team of teams) {
    for (const player of team?.players ?? []) {
      for (const match of player?.matchups ?? []) {
        rows.push({
          offensivePlayerId: num(match.personId),
          offensivePlayerName: str(match.nameI),
          defensivePlayerId: num(player.personId),
          defensivePlayerName: str(player.nameI),
          matchupMinutes: str(match.matchupMinutes),
          partialPossessions: num(match.partialPossessions),
          playerPoints: num(match.playerPoints),
          teamPoints: num(match.teamPoints),
          matchupAssists: num(match.matchupAssists),
          matchupTurnovers: num(match.matchupTurnovers),
          matchupFieldGoalsMade: num(match.matchupFieldGoalsMade),
          matchupFieldGoalsAttempted: num(match.matchupFieldGoalsAttempted),
          matchupThreePointersMade: num(match.matchupThreePointersMade),
          matchupThreePointersAttempted: num(match.matchupThreePointersAttempted),
          matchupFreeThrowsMade: num(match.matchupFreeThrowsMade),
          matchupFreeThrowsAttempted: num(match.matchupFreeThrowsAttempted),
          shootingFouls: num(match.shootingFouls),
          blocks: num(match.blocks),
        })
      }
    }
  }
  return { gameId, rows }
}

export interface NbaShot {
  personId: number
  playerName: string
  teamId: number
  teamTricode: string
  period: number
  clock: string                  // "11:42"
  locX: number                   // half-court coords, see NBA_SHOT_COORDS_NOTE
  locY: number
  shotMade: boolean
  shotType: string               // "2PT Field Goal" / "3PT Field Goal"
  shotZone: string               // "Restricted Area" / "Mid-Range" / "Above the Break 3" / etc
  actionType: string             // "Jump Shot" / "Layup" / "Dunk"
  shotDistance: number           // feet
}

export interface NbaShotChart {
  gameId: string
  shots: NbaShot[]
}

/** Shot coordinates per made/missed shot. Coords are half-court units —
 *  origin at center of basket, +x = right, +y = away from basket. Multiply by
 *  10 to get tenths-of-a-foot, divide by 10 for feet. NBA half-court is 50ft
 *  wide × 47ft long. */
export async function fetchShotChart(
  gameId: string,
  season: string,                // e.g. "2024-25"
  seasonType: 'Regular Season' | 'Playoffs' = 'Regular Season',
): Promise<NbaShotChart> {
  const data = await nbaGet('shotchartdetail', {
    ContextMeasure: 'FGA',
    LastNGames: '0',
    LeagueID: '00',
    Location: '',
    Month: '0',
    OpponentTeamID: '0',
    Outcome: '',
    Period: '0',
    PlayerID: '0',
    RookieYear: '',
    Season: season,
    SeasonSegment: '',
    SeasonType: seasonType,
    TeamID: '0',
    VsConference: '',
    VsDivision: '',
    GameID: gameId,
  })
  // shotchartdetail returns the legacy resultSets[] format (not V3 named-sections).
  const resultSet = data?.resultSets?.find((rs: any) => rs.name === 'Shot_Chart_Detail')
  if (!resultSet) return { gameId, shots: [] }
  const headers: string[] = resultSet.headers
  const rows: any[][] = resultSet.rowSet
  const idx = (h: string) => headers.indexOf(h)
  const iPID = idx('PLAYER_ID')
  const iName = idx('PLAYER_NAME')
  const iTID = idx('TEAM_ID')
  const iTcode = idx('TEAM_NAME')
  const iPeriod = idx('PERIOD')
  const iClockMin = idx('MINUTES_REMAINING')
  const iClockSec = idx('SECONDS_REMAINING')
  const iLocX = idx('LOC_X')
  const iLocY = idx('LOC_Y')
  const iMade = idx('SHOT_MADE_FLAG')
  const iType = idx('SHOT_TYPE')
  const iZone = idx('SHOT_ZONE_BASIC')
  const iAction = idx('ACTION_TYPE')
  const iDist = idx('SHOT_DISTANCE')
  return {
    gameId,
    shots: rows.map((r): NbaShot => ({
      personId: num(r[iPID]),
      playerName: str(r[iName]),
      teamId: num(r[iTID]),
      teamTricode: str(r[iTcode]),
      period: num(r[iPeriod]),
      clock: `${num(r[iClockMin])}:${String(num(r[iClockSec])).padStart(2, '0')}`,
      locX: num(r[iLocX]),
      locY: num(r[iLocY]),
      shotMade: num(r[iMade]) === 1,
      shotType: str(r[iType]),
      shotZone: str(r[iZone]),
      actionType: str(r[iAction]),
      shotDistance: num(r[iDist]),
    })),
  }
}

export interface NbaScoreboardGame {
  gameId: string
  gameStatus: 1 | 2 | 3          // 1 = scheduled, 2 = live, 3 = final
  homeTricode: string
  awayTricode: string
  homeTeamId: number
  awayTeamId: number
  homeScore: number
  awayScore: number
  period: number
  gameClock: string
  gameTimeUTC: string
}

// ─── Video highlights (videodetailsasset) ───────────────────────────────────

export interface NbaHighlightClip {
  uuid: string                   // stats.nba.com video uuid
  eventId: number                // play-by-play event id
  description: string            // "Curry 28' 3PT Jump Shot (12 PTS)"
  period: number
  clock: string                  // "01:23.4"
  homeAbbr: string
  awayAbbr: string
  homeScore: number
  awayScore: number
  thumbnail: string              // best available image
  mp4Url: string                 // best mp4 (lurl preferred → mp4url → murl)
}

const VIDEO_PARAM_DEFAULTS = {
  AheadBehind: '',
  ClutchTime: '',
  ContextFilter: '',
  DateFrom: '',
  DateTo: '',
  EndPeriod: '0',
  EndRange: '28800',
  GameSegment: '',
  GroupQuantity: '0',
  LastNGames: '0',
  Location: '',
  Month: '0',
  OpponentTeamID: '0',
  Outcome: '',
  Period: '0',
  PlayerID: '0',
  PointDiff: '',
  Position: '',
  RangeType: '0',
  RookieYear: '',
  SeasonSegment: '',
  StartPeriod: '0',
  StartRange: '0',
  TeamID: '0',
  VsConference: '',
  VsDivision: '',
} as const

/** Video clips for a game, scoped to a ContextMeasure (FGM/FG3M/AST/BLK/STL/etc).
 *  Default FG3M = 3-pointers made; usually the most highlight-worthy plays
 *  (15-25 clips per game vs 70-100 for FGM). Also tries FGM as a follow-up
 *  when too few clips are returned (early game, low-scoring matchup). */
export async function fetchVideoHighlights(
  gameId: string,
  season: string,
  seasonType: 'Regular Season' | 'Playoffs' = 'Regular Season',
  contextMeasure: 'FGM' | 'FG3M' | 'AST' | 'BLK' | 'STL' = 'FG3M',
  limit = 24,
): Promise<NbaHighlightClip[]> {
  const data = await nbaGet('videodetailsasset', {
    ...VIDEO_PARAM_DEFAULTS,
    LeagueID: '00',
    Season: season,
    SeasonType: seasonType,
    ContextMeasure: contextMeasure,
    GameID: gameId,
  })
  return shapeVideoClips(data, limit)
}

function shapeVideoClips(data: any, limit: number): NbaHighlightClip[] {
  // videodetailsasset returns { resultSets: { Meta: { videoUrls: [...] }, playlist: [...] } }
  const meta = data?.resultSets?.Meta ?? data?.resultSets?.meta
  const playlist: any[] = data?.resultSets?.playlist ?? []
  const videoUrls: any[] = meta?.videoUrls ?? []
  if (!playlist.length || !videoUrls.length) return []

  // playlist[i] pairs with videoUrls[i]
  const clips: NbaHighlightClip[] = []
  const max = Math.min(playlist.length, videoUrls.length, limit)
  for (let i = 0; i < max; i++) {
    const ev = playlist[i]
    const vid = videoUrls[i]
    const mp4Url = str(vid?.lurl) || str(vid?.mp4url) || str(vid?.murl) || str(vid?.surl)
    if (!mp4Url) continue
    clips.push({
      uuid: str(vid?.uuid),
      eventId: num(ev?.ei),
      description: str(ev?.dsc),
      period: num(ev?.p),
      clock: str(ev?.cl),
      homeAbbr: str(ev?.ha),
      awayAbbr: str(ev?.va),
      homeScore: num(ev?.hpb ?? ev?.hps ?? 0),
      awayScore: num(ev?.vpb ?? ev?.vps ?? 0),
      thumbnail: str(vid?.lth) || str(vid?.mth) || str(vid?.sth),
      mp4Url,
    })
  }
  return clips
}

/** Schedule by date. Used to map ESPN gameIds → nba.com gameIds via tricode +
 *  date match. Cached aggressively — schedule for past dates is immutable. */
export async function fetchScoreboardByDate(yyyymmdd: string): Promise<NbaScoreboardGame[]> {
  // ScoreboardV3 wants ISO date, not YYYYMMDD. Convert.
  const iso = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  const data = await nbaGet('scoreboardv3', { GameDate: iso, LeagueID: '00' })
  const games = data?.scoreboard?.games ?? []
  return games.map((g: any): NbaScoreboardGame => ({
    gameId: str(g.gameId),
    gameStatus: num(g.gameStatus) as 1 | 2 | 3,
    homeTricode: str(g.homeTeam?.teamTricode),
    awayTricode: str(g.awayTeam?.teamTricode),
    homeTeamId: num(g.homeTeam?.teamId),
    awayTeamId: num(g.awayTeam?.teamId),
    homeScore: num(g.homeTeam?.score),
    awayScore: num(g.awayTeam?.score),
    period: num(g.period),
    gameClock: str(g.gameClock),
    gameTimeUTC: str(g.gameTimeUTC),
  }))
}

// ─── Internal shaping ───────────────────────────────────────────────────────

function shapeBoxScore(raw: any, gameId: string): NbaBoxScoreV3 {
  if (!raw) {
    return {
      gameId,
      awayTeamId: 0,
      homeTeamId: 0,
      homeTeam: emptyTeamSide(),
      awayTeam: emptyTeamSide(),
    }
  }
  return {
    gameId: str(raw.gameId) || gameId,
    awayTeamId: num(raw.awayTeamId),
    homeTeamId: num(raw.homeTeamId),
    homeTeam: shapeTeamSide(raw.homeTeam),
    awayTeam: shapeTeamSide(raw.awayTeam),
  }
}

function shapeTeamSide(raw: any): NbaTeamSide {
  if (!raw) return emptyTeamSide()
  return {
    teamId: num(raw.teamId),
    teamCity: str(raw.teamCity),
    teamName: str(raw.teamName),
    teamTricode: str(raw.teamTricode),
    teamSlug: str(raw.teamSlug),
    players: (raw.players ?? []).map(shapePlayer),
    statistics: raw.statistics ?? {},
  }
}

function shapePlayer(raw: any): NbaPlayer {
  return {
    personId: num(raw.personId),
    firstName: str(raw.firstName),
    familyName: str(raw.familyName),
    nameI: str(raw.nameI),
    playerSlug: str(raw.playerSlug),
    position: str(raw.position),
    comment: str(raw.comment),
    jerseyNum: str(raw.jerseyNum),
    minutes: str(raw.minutes),
    statistics: raw.statistics ?? {},
  }
}

function emptyTeamSide(): NbaTeamSide {
  return {
    teamId: 0,
    teamCity: '',
    teamName: '',
    teamTricode: '',
    teamSlug: '',
    players: [],
    statistics: {},
  }
}

// HustleStatsBoxScore (V2 legacy) returns resultSets[] — coerce to the V3
// unified shape so callers don't branch. Two relevant resultSets:
//   PlayerHustleStats (player rows w/ TEAM_ID column)
//   TeamHustleStats   (team totals)
function shapeHustleV2(data: any, gameId: string): NbaBoxScoreV3 {
  const playerRs = (data?.resultSets ?? []).find((rs: any) => rs.name === 'PlayerHustleStats')
  const teamRs = (data?.resultSets ?? []).find((rs: any) => rs.name === 'TeamHustleStats')
  if (!playerRs || !teamRs) {
    return {
      gameId,
      awayTeamId: 0,
      homeTeamId: 0,
      homeTeam: emptyTeamSide(),
      awayTeam: emptyTeamSide(),
    }
  }
  const teamRows = rsToObjects(teamRs)
  const playerRows = rsToObjects(playerRs)
  // First two team rows are home + away (resultSets order is consistent — home first
  // in HustleStatsBoxScore historically, but we don't rely on that and read the
  // top-level home/away ids if present).
  const homeRow = teamRows[0] ?? {}
  const awayRow = teamRows[1] ?? {}
  const homeTeamId = num(homeRow.TEAM_ID)
  const awayTeamId = num(awayRow.TEAM_ID)
  const buildSide = (row: any): NbaTeamSide => ({
    teamId: num(row.TEAM_ID),
    teamCity: str(row.CITY),
    teamName: str(row.TEAM_NAME),
    teamTricode: str(row.TEAM_ABBREVIATION),
    teamSlug: str(row.TEAM_NAME).toLowerCase(),
    players: playerRows
      .filter((p: any) => num(p.TEAM_ID) === num(row.TEAM_ID))
      .map((p: any): NbaPlayer => ({
        personId: num(p.PLAYER_ID),
        firstName: str(p.PLAYER_NAME).split(' ')[0] ?? '',
        familyName: str(p.PLAYER_NAME).split(' ').slice(1).join(' ') ?? '',
        nameI: str(p.PLAYER_NAME),
        playerSlug: '',
        position: '',
        comment: '',
        jerseyNum: '',
        minutes: str(p.MINUTES),
        statistics: {
          contestedShots: num(p.CONTESTED_SHOTS),
          contestedShots2pt: num(p.CONTESTED_SHOTS_2PT),
          contestedShots3pt: num(p.CONTESTED_SHOTS_3PT),
          deflections: num(p.DEFLECTIONS),
          chargesDrawn: num(p.CHARGES_DRAWN),
          screenAssists: num(p.SCREEN_ASSISTS),
          screenAssistPoints: num(p.SCREEN_AST_PTS),
          looseBallsRecoveredOffensive: num(p.OFF_LOOSE_BALLS_RECOVERED),
          looseBallsRecoveredDefensive: num(p.DEF_LOOSE_BALLS_RECOVERED),
          looseBallsRecoveredTotal: num(p.LOOSE_BALLS_RECOVERED),
          offensiveBoxOuts: num(p.OFF_BOXOUTS),
          defensiveBoxOuts: num(p.DEF_BOXOUTS),
          boxOutPlayerTeamRebounds: num(p.BOX_OUT_PLAYER_TEAM_REBS),
          boxOutPlayerRebounds: num(p.BOX_OUT_PLAYER_REBS),
          boxOuts: num(p.BOX_OUTS),
        },
      })),
    statistics: {
      contestedShots: num(row.CONTESTED_SHOTS),
      deflections: num(row.DEFLECTIONS),
      chargesDrawn: num(row.CHARGES_DRAWN),
      screenAssists: num(row.SCREEN_ASSISTS),
      looseBallsRecoveredTotal: num(row.LOOSE_BALLS_RECOVERED),
      boxOuts: num(row.BOX_OUTS),
    },
  })
  return {
    gameId,
    homeTeamId,
    awayTeamId,
    homeTeam: buildSide(homeRow),
    awayTeam: buildSide(awayRow),
  }
}

function rsToObjects(rs: any): any[] {
  if (!rs?.headers || !rs?.rowSet) return []
  const headers: string[] = rs.headers
  return rs.rowSet.map((row: any[]) => {
    const obj: any = {}
    headers.forEach((h, i) => { obj[h] = row[i] })
    return obj
  })
}

function num(v: any): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

// ─── Season helper (used by shotchart endpoint) ─────────────────────────────

/** NBA season string from a game date — e.g. Apr 2025 → "2024-25" (the season
 *  that started Oct 2024). Used for shotchartdetail's Season param. */
export function nbaSeasonForDate(d: Date): string {
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed, Oct = 9
  // NBA season runs Oct → June. Oct-Dec belongs to the season starting that
  // year; Jan-June belongs to the season starting the previous year.
  const startYear = month >= 9 ? year : year - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}
