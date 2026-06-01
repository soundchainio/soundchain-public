import { useMutation, gql } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { useMe } from './useMe';

const HEARTBEAT_MUTATION = gql`
  mutation Heartbeat {
    heartbeat {
      id
      lastSeenAt
    }
  }
`;

/**
 * Hook that sends a heartbeat to the server every 60 seconds
 * to track online presence. Pauses when tab is hidden.
 *
 * (Frank, Jun 1 2026 — login-hang fix) This mutation is a Phase-7f Apollo
 * straggler: it hits /api/graphql-stub which returns { data: null }. Writing
 * that into the cache for `heartbeat { id lastSeenAt }` threw Apollo error #13
 * ("missing field"), which triggered markMutationResult → refetchQueries →
 * re-ran every active query (incl. the 500ing /api/me, /api/feed/*) → re-render
 * → fired heartbeat again → infinite loop that pegged the main thread and HUNG
 * the page on the login click. Two fixes:
 *   1. fetchPolicy:'no-cache' + errorPolicy:'ignore' → never writes the cache,
 *      never refetchQueries, never throws. Pure fire-and-forget.
 *   2. Depend on `me?.id` (a stable string), not the whole `me` object — useMe
 *      returns a fresh object ref most renders, so [me] re-ran the effect every
 *      render, restarting the interval + firing a heartbeat each time.
 */
export function useHeartbeat() {
  const me = useMe(); // useMe returns me directly, not { data: me }
  const meId = me?.id || null;
  const [heartbeat] = useMutation(HEARTBEAT_MUTATION, {
    fetchPolicy: 'no-cache',
    errorPolicy: 'ignore',
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only start heartbeat if user is logged in
    if (!meId) {
      return;
    }

    // Send initial heartbeat
    heartbeat().catch(() => {
      // Silently ignore heartbeat errors
    });

    // Set up interval for subsequent heartbeats
    const startHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        heartbeat().catch(() => {
          // Silently ignore heartbeat errors
        });
      }, 60000); // Every 60 seconds
    };

    const stopHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Handle visibility change - pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        // Send heartbeat immediately when tab becomes visible
        heartbeat().catch(() => {});
        startHeartbeat();
      }
    };

    // Start heartbeat and listen for visibility changes
    startHeartbeat();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // Depend on the stable user id, NOT the whole `me` object (fresh ref each
    // render would thrash this effect). `heartbeat` is stable from useMutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);
}

/**
 * Provider component that activates heartbeat tracking
 * Add this to your app layout to enable online presence
 */
export function HeartbeatProvider() {
  useHeartbeat();
  return null;
}
