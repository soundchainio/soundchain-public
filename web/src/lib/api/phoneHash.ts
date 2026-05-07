import crypto from 'crypto'

// Server-side pepper for SHA-256 hashing of phone numbers. Combined with the
// hash on every register + lookup so an attacker who scrapes a hashed-phone
// row can't run a 6-billion-number rainbow table reversal — they'd need the
// pepper too, which is server-only.
//
// Default is a placeholder; production sets PHONE_HASH_PEPPER env var to a
// 32+ char random string. Rotating the pepper invalidates all existing
// phoneHash rows — only do so during a planned migration window.
const PEPPER = process.env.PHONE_HASH_PEPPER || 'sc-phone-pepper-rotate-on-launch-v1'

// Normalize a user-entered phone string to E.164-ish (digits only, leading +).
// Strips spaces, dashes, parens, dots. Adds +1 if a 10-digit US number with no
// country code is provided. Other countries must include their country code.
export function normalizePhone(input: string): string | null {
  if (!input) return null
  const digitsOnly = String(input).replace(/[^\d+]/g, '')
  if (!digitsOnly) return null

  if (digitsOnly.startsWith('+')) {
    const digits = digitsOnly.slice(1)
    if (digits.length < 7 || digits.length > 15) return null
    return `+${digits}`
  }

  // No leading + — assume US/Canada if 10 digits, otherwise reject.
  if (digitsOnly.length === 10) return `+1${digitsOnly}`
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`
  return null
}

export function hashPhone(e164: string): string {
  return crypto.createHash('sha256').update(`${PEPPER}:${e164}`).digest('hex')
}

// One-shot helper: normalize then hash. Returns null on bad input.
export function normalizeAndHash(input: string): { e164: string; hash: string } | null {
  const e164 = normalizePhone(input)
  if (!e164) return null
  return { e164, hash: hashPhone(e164) }
}
