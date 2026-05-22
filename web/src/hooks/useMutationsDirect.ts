/**
 * Phase 7f — Vercel-direct replacement for Apollo write mutations.
 *
 * Each hook mirrors Apollo's tuple shape `[trigger, { loading, error, data }]`
 * so callsites can swap with a 1-line aliased import.
 *
 * The trigger function returns the Apollo-shaped { data } object on success
 * (or throws on error) so callers that await the result and check
 * `result?.data?.foo` keep working.
 *
 * Cache invalidation: each mutation may call into a global "mutated tag"
 * registry that hooks (like useChats, useNotifications) listen to and
 * trigger their own refetch on. Kept simple for now — consumers call
 * refetch() explicitly after mutate where needed.
 */
import { useCallback, useState } from 'react'
import { invalidateMe } from './useMe'

type MutResult<T> = { data: T | undefined; loading: boolean; error: Error | null }
type Mut<TVars, TData> = [
  (opts?: { variables?: TVars }) => Promise<{ data?: TData } | undefined>,
  MutResult<TData>,
]

const doPost = async (url: string, body?: any, method: 'POST' | 'PATCH' | 'DELETE' = 'POST'): Promise<any> => {
  const r = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err?.error || `${method} ${url} failed`)
  }
  return r.json().catch(() => ({}))
}

const useMutBase = <TVars, TData>(
  run: (vars: TVars) => Promise<TData>
): Mut<TVars, TData> => {
  const [data, setData] = useState<TData | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const trigger = useCallback(async (opts?: { variables?: TVars }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await run((opts?.variables || {}) as TVars)
      setData(result)
      return { data: result }
    } catch (e: any) {
      setError(e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [run])
  return [trigger, { data, loading, error }]
}

// --- useToggleFavoriteMutation ---
// Apollo: { variables: { trackId } } → data.toggleFavorite { isFavorite }
type ToggleFavoriteVars = { trackId: string }
type ToggleFavoriteData = { toggleFavorite: { isFavorite: boolean } }

export const useToggleFavoriteMutation = (_opts?: any): Mut<ToggleFavoriteVars, ToggleFavoriteData> => {
  return useMutBase<ToggleFavoriteVars, ToggleFavoriteData>(async (vars) => {
    const r = await doPost('/api/tracks/favorite', { trackId: vars.trackId })
    return { toggleFavorite: { isFavorite: !!r?.isFavorite } }
  })
}

// --- useFollowProfileMutation ---
// Apollo: { variables: { followedProfileId } } → data.followProfile { ok }
type FollowVars = { followedProfileId?: string; profileId?: string; input?: { followedId?: string; followedProfileId?: string } }
type FollowData = { followProfile: { ok: boolean } }

const followIdFromVars = (v: FollowVars): string => {
  return v?.input?.followedId || v?.input?.followedProfileId || v?.followedProfileId || v?.profileId || ''
}

export const useFollowProfileMutation = (_opts?: any): Mut<FollowVars, FollowData> => {
  return useMutBase<FollowVars, FollowData>(async (vars) => {
    const followedId = followIdFromVars(vars)
    if (!followedId) throw new Error('followedId required')
    await doPost('/api/follow/toggle', { followedId, action: 'follow' })
    return { followProfile: { ok: true } }
  })
}

// --- useUnfollowProfileMutation ---
type UnfollowData = { unfollowProfile: { ok: boolean } }

export const useUnfollowProfileMutation = (_opts?: any): Mut<FollowVars, UnfollowData> => {
  return useMutBase<FollowVars, UnfollowData>(async (vars) => {
    const followedId = followIdFromVars(vars)
    if (!followedId) throw new Error('followedId required')
    await doPost('/api/follow/toggle', { followedId, action: 'unfollow' })
    return { unfollowProfile: { ok: true } }
  })
}

// --- useResetUnreadMessageCountMutation ---
// Apollo: { variables?: { fromProfileId? } } → data.resetUnreadMessageCount { ok }
type ResetUnreadVars = { fromProfileId?: string } | undefined
type ResetUnreadData = { resetUnreadMessageCount: { ok: boolean } }

export const useResetUnreadMessageCountMutation = (_opts?: any): Mut<ResetUnreadVars, ResetUnreadData> => {
  return useMutBase<ResetUnreadVars, ResetUnreadData>(async (vars) => {
    await doPost('/api/dm/mark-read', { fromProfileId: vars?.fromProfileId })
    await invalidateMe()
    return { resetUnreadMessageCount: { ok: true } }
  })
}

// --- useUpdateHandleMutation ---
// Apollo: { variables: { handle } } → data.updateHandle { ok }
type UpdateHandleVars = { handle?: string; input?: { handle?: string } }
type UpdateHandleData = { updateHandle: { ok: boolean; handle: string } }

export const useUpdateHandleMutation = (_opts?: any): Mut<UpdateHandleVars, UpdateHandleData> => {
  return useMutBase<UpdateHandleVars, UpdateHandleData>(async (vars) => {
    const handle = vars?.input?.handle || vars?.handle || ''
    if (!handle) throw new Error('handle required')
    await doPost('/api/profile/update', { fields: { handle } })
    await invalidateMe()
    return { updateHandle: { ok: true, handle } }
  })
}

// --- useUpdateProfileDisplayNameMutation ---
type UpdateDisplayNameVars = { displayName?: string; input?: { displayName?: string } }
type UpdateDisplayNameData = { updateProfileDisplayName: { ok: boolean; displayName: string } }

export const useUpdateProfileDisplayNameMutation = (_opts?: any): Mut<UpdateDisplayNameVars, UpdateDisplayNameData> => {
  return useMutBase<UpdateDisplayNameVars, UpdateDisplayNameData>(async (vars) => {
    const displayName = vars?.input?.displayName || vars?.displayName || ''
    if (!displayName) throw new Error('displayName required')
    await doPost('/api/profile/update', { fields: { displayName } })
    await invalidateMe()
    return { updateProfileDisplayName: { ok: true, displayName } }
  })
}

// --- useCreateProfileVerificationRequestMutation ---
type CreateVerifVars = {
  input?: { soundcloudUrl?: string; youtubeUrl?: string; bandcampUrl?: string; notes?: string }
  soundcloudUrl?: string
  youtubeUrl?: string
  bandcampUrl?: string
  notes?: string
}
type CreateVerifData = { createProfileVerificationRequest: { ok: boolean; status: string } }

export const useCreateProfileVerificationRequestMutation = (_opts?: any): Mut<CreateVerifVars, CreateVerifData> => {
  return useMutBase<CreateVerifVars, CreateVerifData>(async (vars) => {
    const body = vars?.input || vars || {}
    const result = await doPost('/api/profile/verification', body)
    return { createProfileVerificationRequest: { ok: !!result?.success, status: result?.status || 'pending' } }
  })
}

// --- useUpdateProfileVerificationRequestMutation (admin) ---
type UpdateVerifVars = {
  input?: { requestId?: string; status?: string; reason?: string }
  requestId?: string
  status?: string
  reason?: string
}
type UpdateVerifData = { updateProfileVerificationRequest: { ok: boolean; status: string } }

export const useUpdateProfileVerificationRequestMutation = (_opts?: any): Mut<UpdateVerifVars, UpdateVerifData> => {
  return useMutBase<UpdateVerifVars, UpdateVerifData>(async (vars) => {
    const v = vars?.input || vars || {}
    if (!v.requestId) throw new Error('requestId required')
    if (!v.status) throw new Error('status required')
    const result = await doPost('/api/profile/verification', { requestId: v.requestId, status: v.status, reason: v.reason }, 'PATCH')
    return { updateProfileVerificationRequest: { ok: !!result?.success, status: result?.status || v.status } }
  })
}

// --- useUpdateCommentMutation ---
type UpdateCommentVars = { input?: { commentId?: string; body?: string }; commentId?: string; body?: string }
type UpdateCommentData = { updateComment: { ok: boolean } }

export const useUpdateCommentMutation = (_opts?: any): Mut<UpdateCommentVars, UpdateCommentData> => {
  return useMutBase<UpdateCommentVars, UpdateCommentData>(async (vars) => {
    const v = vars?.input || vars || {}
    if (!v.commentId || !v.body) throw new Error('commentId + body required')
    await doPost('/api/feed/comments', { commentId: v.commentId, body: v.body }, 'PATCH')
    return { updateComment: { ok: true } }
  })
}
