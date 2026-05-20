/**
 * Phase 7e — Vercel-direct replacement for `useProfileVerificationRequestQuery`.
 *
 * GET /api/profile/verification (cookie-authed) → ProfileVerificationRequest
 * Returns the Apollo contract `data.profileVerificationRequest = {...}`.
 *
 * Per-session cache (verification status doesn't change often). Supports
 * `skip` so DexNavBar can defer the fetch until the user is authed.
 */
import { useEffect, useState } from 'react'
import type { ProfileVerificationStatusType } from 'lib/graphql'

type VerificationRequest = {
  id: string
  profileId: string
  soundcloud: string | null
  youtube: string | null
  bandcamp: string | null
  status: ProfileVerificationStatusType | null
  reason: string | null
  reviewerProfileId: string | null
  createdAt: string
  updatedAt: string
}

type ApolloShape = { profileVerificationRequest: VerificationRequest | null }

let cache: { value: ApolloShape; ts: number } | null = null
let inflight: Promise<ApolloShape | null> | null = null
const FRESH_MS = 60_000

const loadVerification = async (): Promise<ApolloShape | null> => {
  if (cache && Date.now() - cache.ts < FRESH_MS) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/profile/verification', { credentials: 'include' })
      if (!r.ok) {
        // Unauthed or no request → return empty (Apollo would too)
        const value: ApolloShape = { profileVerificationRequest: null }
        cache = { value, ts: Date.now() }
        return value
      }
      const json = await r.json()
      const v = json?.profileVerificationRequest || json
      const value: ApolloShape = {
        profileVerificationRequest: v && v.id ? {
          id: String(v.id),
          profileId: String(v.profileId || ''),
          soundcloud: v.soundcloud ?? null,
          youtube: v.youtube ?? null,
          bandcamp: v.bandcamp ?? null,
          status: v.status ?? null,
          reason: v.reason ?? null,
          reviewerProfileId: v.reviewerProfileId ?? null,
          createdAt: v.createdAt || '',
          updatedAt: v.updatedAt || '',
        } : null,
      }
      cache = { value, ts: Date.now() }
      return value
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export const useProfileVerificationRequest = (opts?: { skip?: boolean }): { data: ApolloShape | undefined; loading: boolean; error: Error | null } => {
  const skip = !!opts?.skip
  const initial = !skip && cache && Date.now() - cache.ts < FRESH_MS ? cache.value : undefined
  const [data, setData] = useState<ApolloShape | undefined>(initial)
  const [loading, setLoading] = useState<boolean>(!skip && !initial)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    if (data) { setLoading(false); return }
    setLoading(true)
    loadVerification().then((value) => {
      if (cancelled) return
      if (value) { setData(value); setError(null) }
      else setError(new Error('verification load failed'))
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip])
  return { data, loading, error }
}
