import { useCallback, useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';

// GraphQL queries and mutations
const VAPID_PUBLIC_KEY_QUERY = gql`
  query VapidPublicKey {
    vapidPublicKey
  }
`;

const SUBSCRIBE_TO_PUSH = gql`
  mutation SubscribeToPush($input: PushSubscriptionInput!) {
    subscribeToPush(input: $input) {
      id
      endpoint
    }
  }
`;

const UNSUBSCRIBE_FROM_PUSH = gql`
  mutation UnsubscribeFromPush($endpoint: String!) {
    unsubscribeFromPush(endpoint: $endpoint)
  }
`;

const HAS_PUSH_SUBSCRIPTION = gql`
  query HasPushSubscription {
    hasPushSubscription
  }
`;

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  /** Current browser permission state */
  permission: PermissionState;
  /** Whether the user has subscribed on the server */
  isSubscribed: boolean;
  /** Whether subscription is loading */
  isLoading: boolean;
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Error message if any */
  error: string | null;
}

/**
 * Convert VAPID public key from base64 to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get device name for identifying subscriptions
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS Device';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown Device';
}

/**
 * Hook to manage web push notification subscriptions
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push is supported
  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  // Get VAPID public key from server
  const { data: vapidData } = useQuery(VAPID_PUBLIC_KEY_QUERY, {
    skip: !isSupported,
  });

  // Check if user has subscription on server
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery(HAS_PUSH_SUBSCRIPTION, {
    skip: !isSupported,
    fetchPolicy: 'network-only',
  });

  const [subscribeMutation] = useMutation(SUBSCRIBE_TO_PUSH);
  const [unsubscribeMutation] = useMutation(UNSUBSCRIBE_FROM_PUSH);

  // Update permission state on mount and when it changes
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }

    // Get current permission state
    const updatePermission = () => {
      const state = Notification.permission as PermissionState;
      setPermission(state === 'default' ? 'prompt' : state);
    };

    updatePermission();

    // Listen for permission changes (not all browsers support this)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        status.onchange = updatePermission;
      }).catch(() => {
        // Ignore - some browsers don't support permission queries
      });
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    if (!vapidData?.vapidPublicKey) {
      setError('Push notifications are not configured');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // Create new subscription if none exists
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey),
        });
      }

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await subscribeMutation({
        variables: {
          input: {
            endpoint: subscriptionJson.endpoint,
            keys: {
              p256dh: subscriptionJson.keys?.p256dh || '',
              auth: subscriptionJson.keys?.auth || '',
            },
            userAgent: navigator.userAgent,
            deviceName: getDeviceName(),
          },
        },
      });

      await refetchSubscription();
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidData, subscribeMutation, refetchSubscription]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await unsubscribeMutation({
          variables: { endpoint: subscription.endpoint },
        });
      }

      await refetchSubscription();
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, unsubscribeMutation, refetchSubscription]);

  return {
    permission,
    isSubscribed: subscriptionData?.hasPushSubscription ?? false,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    error,
  };
}
