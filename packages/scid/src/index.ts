/**
 * @soundchain/scid — SoundChain ID format, parsing, validation, certificate.
 *
 * SCid is SoundChain's Web3-native replacement for ISRC codes. Format:
 *
 *     SC-POL-XXXX-XXXXXX
 *     │   │    │     │
 *     │   │    │     └─ 6-char sequence (per-edition increment)
 *     │   │    └─ 4-char edition tag
 *     │   └─ 3-char chain code (POL = Polygon)
 *     └─ Static prefix
 *
 * Example: SC-POL-D038-2600003
 *
 * SCid is what makes SC the ASCAP/BMI rival — it's IP infrastructure that
 * survives any future regulatory shift. This package belongs to ALL apps
 * (web, arena, mint) because all of them reference SCid one way or another
 * (web owns registration, mint embeds it in NFT metadata, arena could
 * surface artist profile shop tabs via SCid).
 */

// ─── Format constants ─────────────────────────────────────────────────────

export const SCID_PREFIX = 'SC'
export const SCID_CHAIN_POLYGON = 'POL'
export const SCID_FORMAT_REGEX = /^SC-([A-Z]{3})-([A-Z0-9]{4})-([A-Z0-9]{6})$/

// ─── Parsing & validation ─────────────────────────────────────────────────

export interface ParsedScid {
  /** Full SCid string, e.g. "SC-POL-D038-2600003" */
  full: string
  /** 3-letter chain code, e.g. "POL" */
  chainCode: string
  /** 4-char edition tag, e.g. "D038" */
  edition: string
  /** 6-char sequence, e.g. "2600003" — string-preserved to retain leading zeros */
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

// ─── Certificate (re-exported & extended from web/src/utils/SCidCertificate) ─

export interface SCidCertificateData {
  // SCid Info
  scid: string
  chainCode: string
  status: string

  // Track Info
  trackId?: string
  title: string
  artist?: string
  album?: string
  description?: string
  releaseYear?: number
  copyright?: string
  genres?: string[]

  // IPFS Info (decentralized storage proof) - may be pending if async pinning
  ipfsCid?: string
  ipfsGatewayUrl?: string
  ipfsStatus?: 'ready' | 'pinning' | 'pending'

  // Verification
  checksum?: string
  registeredAt: string
  platform: string
  version: string
}

export function generateCertificate(data: {
  scid: string
  chainCode?: string
  status?: string
  trackId?: string
  title: string
  artist?: string
  album?: string
  description?: string
  releaseYear?: number
  copyright?: string
  genres?: string[]
  ipfsCid?: string
  ipfsGatewayUrl?: string
  checksum?: string
}): SCidCertificateData {
  const hasIpfs = !!data.ipfsCid && data.ipfsCid.length > 0
  return {
    scid: data.scid,
    chainCode: data.chainCode || SCID_CHAIN_POLYGON,
    status: data.status || 'REGISTERED',
    trackId: data.trackId,
    title: data.title,
    artist: data.artist,
    album: data.album,
    description: data.description,
    releaseYear: data.releaseYear,
    copyright: data.copyright,
    genres: data.genres,
    ipfsCid: data.ipfsCid || undefined,
    ipfsGatewayUrl: data.ipfsGatewayUrl || undefined,
    ipfsStatus: hasIpfs ? 'ready' : 'pinning',
    checksum: data.checksum,
    registeredAt: new Date().toISOString(),
    platform: 'SoundChain',
    version: '1.0',
  }
}

export function generateTextCertificate(cert: SCidCertificateData): string {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                    SOUNDCHAIN SCid CERTIFICATE                   ║
║                    Web3 Music Registration Proof                 ║
╠══════════════════════════════════════════════════════════════════╣

  SCid:           ${cert.scid}
  Status:         ${cert.status}
  Chain:          ${cert.chainCode}

══════════════════════════════════════════════════════════════════

  TRACK INFORMATION

  Title:          ${cert.title}
  Artist:         ${cert.artist || 'Not specified'}
  Album:          ${cert.album || 'Not specified'}
  Release Year:   ${cert.releaseYear || 'Not specified'}
  Copyright:      ${cert.copyright || 'Not specified'}
  Genres:         ${cert.genres?.join(', ') || 'Not specified'}

══════════════════════════════════════════════════════════════════

  IPFS STORAGE (DECENTRALIZED)

  IPFS CID:       ${cert.ipfsCid || 'Pinning in progress...'}
  Gateway URL:    ${cert.ipfsGatewayUrl || 'Will be available after pinning'}
  Status:         ${cert.ipfsStatus === 'ready' ? 'Ready' : 'Pinning to IPFS (background)'}

══════════════════════════════════════════════════════════════════

  VERIFICATION

  Registered:     ${cert.registeredAt}
  Platform:       ${cert.platform}
  Version:        ${cert.version}
  ${cert.checksum ? `Checksum:       ${cert.checksum}` : ''}

╚══════════════════════════════════════════════════════════════════╝

This certificate proves that the above track was registered on the
SoundChain platform and stored on IPFS (InterPlanetary File System).

The SCid (SoundChain ID) is a Web3 replacement for ISRC codes,
providing decentralized music identification.

Keep this certificate safe - it's your proof of registration!

Verify at: https://soundchain.io/verify/${cert.scid}
`.trim()
}

export function downloadCertificateJSON(cert: SCidCertificateData): void {
  const json = JSON.stringify(cert, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `soundchain-certificate-${cert.scid}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCertificateText(cert: SCidCertificateData): void {
  const text = generateTextCertificate(cert)
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `soundchain-certificate-${cert.scid}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCertificates(cert: SCidCertificateData): void {
  downloadCertificateJSON(cert)
  setTimeout(() => downloadCertificateText(cert), 500)
}

export async function copyCertificateToClipboard(cert: SCidCertificateData): Promise<boolean> {
  try {
    const text = generateTextCertificate(cert)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function generateShareableLink(cert: SCidCertificateData): string {
  return `https://soundchain.io/track/${cert.scid}`
}
