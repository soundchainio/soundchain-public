/**
 * Local SCid utilities for mint/ — mirrors packages/scid/src/index.ts.
 *
 * Inlined to avoid the monorepo workspace requirement on Vercel deploys
 * with Root Directory = mint/. Will switch back to @soundchain/scid when
 * yarn workspaces lands.
 */

export const SCID_PREFIX = 'SC'
export const SCID_CHAIN_POLYGON = 'POL'
export const SCID_FORMAT_REGEX = /^SC-([A-Z]{3})-([A-Z0-9]{4})-([A-Z0-9]{6})$/

export interface ParsedScid {
  full: string
  chainCode: string
  edition: string
  sequence: string
}

export function parseScid(scid: string): ParsedScid | null {
  if (!scid || typeof scid !== 'string') return null
  const match = SCID_FORMAT_REGEX.exec(scid.trim())
  if (!match) return null
  return {
    full: scid.trim(),
    chainCode: match[1],
    edition: match[2],
    sequence: match[3],
  }
}

export function isValidScid(scid: string): boolean {
  return parseScid(scid) !== null
}
