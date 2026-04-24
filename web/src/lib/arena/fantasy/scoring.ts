/**
 * Standard NFL fantasy scoring (PPR — point per reception).
 *
 * Matches ESPN / CBS default PPR scoring so live-score backfill from
 * `/api/arena/fantasy/players` (ESPN stats) maps cleanly to these rules.
 */

export interface FantasyPlayerStats {
  passYards?: number
  passTDs?: number
  passInts?: number
  rushYards?: number
  rushTDs?: number
  receptions?: number
  recYards?: number
  recTDs?: number
  fumblesLost?: number
  twoPointConversions?: number
  fieldGoalsMade?: number       // average — for granular length-based kicker scoring, extend rules
  extraPointsMade?: number
  defTDs?: number
  defSacks?: number
  defInts?: number
  defFumbleRecoveries?: number
  defSafeties?: number
  defPointsAllowed?: number     // used by defPointsAllowedBuckets below
}

/** PPR rules as floats — applied by computeFantasyPoints(). */
export const PPR_RULES = {
  passYardPerPt: 25,         // 1pt / 25 yards
  passTD: 4,
  passInt: -2,
  rushYardPerPt: 10,
  rushTD: 6,
  reception: 1,              // PPR
  recYardPerPt: 10,
  recTD: 6,
  fumbleLost: -2,
  twoPointConversion: 2,
  fieldGoal: 3,              // flat (extend for 50+ yarders if you want)
  extraPoint: 1,
  defTD: 6,
  defSack: 1,
  defInt: 2,
  defFumbleRecovery: 2,
  defSafety: 2,
}

/** DST points-allowed buckets (standard). */
export function defPointsAllowedBonus(pa: number): number {
  if (pa === 0) return 10
  if (pa <= 6) return 7
  if (pa <= 13) return 4
  if (pa <= 20) return 1
  if (pa <= 27) return 0
  if (pa <= 34) return -1
  return -4
}

export function computeFantasyPoints(s: FantasyPlayerStats): number {
  const R = PPR_RULES
  let pts = 0
  pts += (s.passYards ?? 0) / R.passYardPerPt
  pts += (s.passTDs ?? 0) * R.passTD
  pts += (s.passInts ?? 0) * R.passInt
  pts += (s.rushYards ?? 0) / R.rushYardPerPt
  pts += (s.rushTDs ?? 0) * R.rushTD
  pts += (s.receptions ?? 0) * R.reception
  pts += (s.recYards ?? 0) / R.recYardPerPt
  pts += (s.recTDs ?? 0) * R.recTD
  pts += (s.fumblesLost ?? 0) * R.fumbleLost
  pts += (s.twoPointConversions ?? 0) * R.twoPointConversion
  pts += (s.fieldGoalsMade ?? 0) * R.fieldGoal
  pts += (s.extraPointsMade ?? 0) * R.extraPoint
  pts += (s.defTDs ?? 0) * R.defTD
  pts += (s.defSacks ?? 0) * R.defSack
  pts += (s.defInts ?? 0) * R.defInt
  pts += (s.defFumbleRecoveries ?? 0) * R.defFumbleRecovery
  pts += (s.defSafeties ?? 0) * R.defSafety
  if (typeof s.defPointsAllowed === 'number') {
    pts += defPointsAllowedBonus(s.defPointsAllowed)
  }
  return Math.round(pts * 100) / 100   // 2 decimal places
}
