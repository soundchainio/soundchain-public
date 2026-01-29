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
 */
export function useHeartbeat() {
  const me = useMe(); // useMe returns me directly, not { data: me }
  const [heartbeat] = useMutation(HEARTBEAT_MUTATION);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only start heartbeat if user is logged in
    if (!me) {
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
  }, [me, heartbeat]);
}

/**
 * Provider component that activates heartbeat tracking
 * Add this to your app layout to enable online presence
 */
export function HeartbeatProvider() {
  useHeartbeat();
  return null;
}
