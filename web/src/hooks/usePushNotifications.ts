import { useCallback, useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';

// VAPID public key — this is a PUBLIC key, safe to include in client code.
// Used as fallback when GraphQL query fails (e.g. Lambda env vars not set yet).
const VAPID_PUBLIC_KEY_FALLBACK = 'BJyVXuYo6LF6voKAShxlOo6V47M2R3RGCjKK_uQ6PA8T0ryyBE4qpYeKcY1k1UjO7VcEFvvIaSmsJWEcrN5eV3w';

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
  /** Subscribe to push notifications — returns success + error message */
  subscribe: () => Promise<{ success: boolean; error?: string }>;
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
  // Track whether the CLIENT actually has an active push subscription in the browser
  const [hasClientSubscription, setHasClientSubscription] = useState(false);

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
  // Also check if client actually has a push subscription (detects stale server records)
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

    // Check if the browser actually has an active push subscription
    // This catches the case where server says "subscribed" but client cache was cleared
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setHasClientSubscription(!!sub);
        } else {
          setHasClientSubscription(false);
        }
      } catch {
        setHasClientSubscription(false);
      }
    })();

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
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported) {
      const msg = 'Push notifications are not supported in this browser';
      setError(msg);
      return { success: false, error: msg };
    }

    const vapidKey = vapidData?.vapidPublicKey || VAPID_PUBLIC_KEY_FALLBACK;
    if (!vapidKey) {
      const msg = 'Push notifications are not configured';
      setError(msg);
      return { success: false, error: msg };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      // On iOS PWA, requestPermission() can race with the OS prompt — if the result
      // comes back as 'default' or 'denied' right after showing the prompt, wait briefly
      // then re-check Notification.permission in case iOS updated it asynchronously.
      let result = await Notification.requestPermission();

      // iOS PWA workaround: permission state may lag behind the OS prompt
      if (result !== 'granted' && typeof Notification !== 'undefined') {
        // Wait 500ms for iOS to settle, then re-read the actual permission
        await new Promise(r => setTimeout(r, 500));
        const currentPerm = Notification.permission;
        if (currentPerm === 'granted') {
          result = 'granted';
        }
      }

      setPermission(result as PermissionState);

      if (result !== 'granted') {
        const msg = `Notification permission denied (browser returned: ${result})`;
        setError(msg);
        return { success: false, error: msg };
      }

      // Get service worker registration with timeout (iOS PWA can hang on .ready)
      const swTimeout = (ms: number) => new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Service worker not ready after ${ms / 1000}s — try closing and reopening the app`)), ms)
      );

      // Helper: wait for a service worker to reach 'activated' state
      const waitForSWActive = (reg: ServiceWorkerRegistration, ms: number): Promise<ServiceWorkerRegistration> => {
        if (reg.active) return Promise.resolve(reg);
        const sw = reg.installing || reg.waiting;
        if (!sw) return Promise.reject(new Error('No service worker found on registration'));
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Service worker activation timed out')), ms);
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
              clearTimeout(timer);
              resolve(reg);
            }
          });
          // Check once more in case it activated between our check and listener
          if (sw.state === 'activated' || reg.active) {
            clearTimeout(timer);
            resolve(reg);
          }
        });
      };

      let registration: ServiceWorkerRegistration;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          swTimeout(10000), // 10 second timeout
        ]);
      } catch (swErr) {
        // If .ready hangs, try getRegistration() or register explicitly as fallback
        console.warn('[usePushNotifications] SW ready timed out, trying getRegistration()');
        let existing = await navigator.serviceWorker.getRegistration();
        if (!existing) {
          // Try explicit registration as last resort
          try {
            console.warn('[usePushNotifications] No registration found, registering /sw.js');
            existing = await navigator.serviceWorker.register('/sw.js');
          } catch {
            return { success: false, error: 'Service worker not available. Close the app fully and reopen it.' };
          }
        }
        // Wait for the SW to become active (up to 8s) — fixes "requires active service worker" on fresh install
        try {
          registration = await waitForSWActive(existing, 8000);
        } catch {
          return { success: false, error: 'Service worker is starting up. Tap Retry in a few seconds.' };
        }
      }

      // Ensure SW is active before proceeding (covers both paths)
      if (!registration.active) {
        try {
          registration = await waitForSWActive(registration, 8000);
        } catch {
          return { success: false, error: 'Service worker is starting up. Tap Retry in a few seconds.' };
        }
      }

      // Check for existing subscription with timeout
      let subscription: PushSubscription | null = null;
      try {
        subscription = await Promise.race([
          registration.pushManager.getSubscription(),
          swTimeout(8000),
        ]);
      } catch {
        subscription = null;
      }

      // Create new subscription if none exists
      if (!subscription) {
        try {
          subscription = await Promise.race([
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            }),
            swTimeout(15000), // 15 second timeout for subscribe
          ]);
        } catch (subErr) {
          const msg = subErr instanceof Error ? subErr.message : 'Failed to create push subscription';
          return { success: false, error: msg };
        }
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

      setHasClientSubscription(true);
      await refetchSubscription();
      return { success: true };
    } catch (err) {
      console.error('[usePushNotifications] Subscribe error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidData?.vapidPublicKey, subscribeMutation, refetchSubscription]);

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

  // Only report as subscribed if BOTH server AND client agree.
  // If server says subscribed but client has no subscription (e.g. user cleared Safari cache),
  // report as NOT subscribed so the banner shows again.
  const serverSaysSubscribed = subscriptionData?.hasPushSubscription ?? false;
  const trulySubscribed = serverSaysSubscribed && hasClientSubscription;

  return {
    permission,
    isSubscribed: trulySubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    error,
  };
}
