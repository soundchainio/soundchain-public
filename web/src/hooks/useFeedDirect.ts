/**
 * useFeedDirect — Fast feed hook that pre-fetches via Vercel direct route
 *
 * Fires a Vercel direct fetch on mount to warm the data. The Apollo
 * useFeedQuery still runs in parallel for full GraphQL compatibility
 * (reactions, bookmarks, tracks, etc.). But the Vercel fetch warms
 * the Atlas connection so Apollo's Lambda query is faster.
 *
 * This is a BRIDGE pattern — not a full replacement. It makes the
 * existing Apollo query faster without changing Feed.tsx's data flow.
 */

import { useEffect, useRef } from 'react'

/**
 * Call this at the top of any component that loads feed data.
 * It fires a silent pre-fetch to warm the Vercel → Atlas connection
 * and pre-populate browser cache with feed data.
 *
 * @param profileId - the user's profile ID (for feed query)
 */
export function useFeedPrewarm(profileId?: string) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || !profileId) return
    fired.current = true

    // Pre-warm: fire Vercel direct feed fetch silently
    // This warms the MongoDB connection pool on Vercel's side
    // The actual feed data comes from Apollo, but this makes Atlas ready
    fetch(`/api/feed/posts?profileId=${profileId}&limit=5`)
      .catch(() => {}) // Silent — warming only

    // Also pre-warm the Lambda for Apollo queries that follow
    fetch('https://19ne212py4.execute-api.us-east-1.amazonaws.com/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"query":"{ __typename }"}',
    }).catch(() => {})
  }, [profileId])
}

/**
 * Pre-warm profile data via Vercel direct route.
 * Call when navigating to a profile page.
 */
export function useProfilePrewarm(handle?: string) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || !handle) return
    fired.current = true
    fetch(`/api/feed/profile?handle=${encodeURIComponent(handle)}`)
      .catch(() => {})
  }, [handle])
}
