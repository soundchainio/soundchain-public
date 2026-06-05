import crypto from 'crypto'

// ─── MANAGER pay-to-reveal crypto ─────────────────────────────────────────────
// Sensitive bank/wire details a pro stores are encrypted AT REST with a
// SERVER-ONLY key (BANK_ENCRYPTION_KEY) and only ever decrypted server-side,
// AFTER an on-chain escrow deposit is confirmed (pay-to-reveal). The key is never
// in the browser bundle (no NEXT_PUBLIC_ prefix) — decrypting client-side would
// leak the key and make the whole thing theater. AES-256-GCM (authenticated):
// tampering with the ciphertext fails the auth tag → decrypt throws, never
// returns garbage.

const RAW = process.env.BANK_ENCRYPTION_KEY || ''

// The vault is only "configured" with a real, sufficiently-long secret. A blank
// or stub key disables encryption entirely (the bank API returns a clean 503
// instead of silently encrypting with a guessable key).
export function isVaultConfigured(): boolean {
  return RAW.length >= 16
}

// Derive a stable 32-byte AES key from whatever secret is provided (a 64-char
// hex string, a passphrase, etc.) so ops can rotate without a fixed format.
function aesKey(): Buffer {
  if (!isVaultConfigured()) throw new Error('BANK_ENCRYPTION_KEY not configured')
  return crypto.createHash('sha256').update(RAW).digest()
}

// `v1:<iv>:<tag>:<ciphertext>` — all hex. Empty in → empty out (so blank optional
// fields don't store noise).
export function encryptField(plain: string): string {
  if (!plain) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptField(blob: string): string {
  if (!blob) return ''
  const parts = blob.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') return ''
  const [, ivH, tagH, dataH] = parts
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey(), Buffer.from(ivH, 'hex'))
  decipher.setAuthTag(Buffer.from(tagH, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataH, 'hex')), decipher.final()]).toString('utf8')
}

// Owner-facing masked echo: never show the full secret back in the settings UI,
// just enough to recognize it ("•••• 4321").
export function maskValue(plain: string): string {
  if (!plain) return ''
  const tail = plain.slice(-4)
  return `•••• ${tail}`
}

// Reveal-token plumbing: the escrow record stores only the HASH of the reveal
// token; the raw token is handed to the paying promoter once and used to unlock
// the bank details after the deposit confirms. So a DB leak never exposes a
// working reveal token.
export function randomRevealToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
