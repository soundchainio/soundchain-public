/**
 * SoundChain Custom Service Worker Handlers
 * This file is bundled with next-pwa's generated service worker
 *
 * Features:
 * - Push notifications (VAPID)
 * - Background Sync (offline queue)
 * - Periodic Sync (check for notifications even when closed)
 */

// ============================================
// PUSH NOTIFICATIONS
// ============================================

// Handle push events (notifications from server)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
    data = { title: 'SoundChain', body: event.data?.text() || 'You have a new notification' };
  }

  const { title = 'SoundChain', body = '', icon, badge, url, tag, actions } = data;

  const options = {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    data: { url: url || '/dex/notifications' },
    tag: tag || 'soundchain-notification',
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/dex/notifications';

  // Handle action buttons if present
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// ============================================
// BACKGROUND SYNC - Offline Queue
// ============================================

// Queue for offline actions (likes, comments, tips, etc.)
const OFFLINE_QUEUE_NAME = 'soundchain-offline-queue';

// Handle sync event (triggered when online after being offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'soundchain-sync') {
    event.waitUntil(processOfflineQueue());
  }

  if (event.tag === 'soundchain-notifications-sync') {
    event.waitUntil(fetchPendingNotifications());
  }
});

// Process queued offline actions
async function processOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE_NAME);
    const requests = await cache.keys();

    console.log('[SW] Processing offline queue:', requests.length, 'items');

    for (const request of requests) {
      try {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          const data = await cachedResponse.json();

          // Replay the action
          const response = await fetch(data.url, {
            method: data.method || 'POST',
            headers: data.headers || { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.body),
          });

          if (response.ok) {
            await cache.delete(request);
            console.log('[SW] Synced offline action:', data.action);
          }
        }
      } catch (err) {
        console.error('[SW] Failed to sync item:', err);
      }
    }
  } catch (err) {
    console.error('[SW] Failed to process offline queue:', err);
  }
}

// Fetch any pending notifications from server
async function fetchPendingNotifications() {
  try {
    // Get stored auth token
    const allClients = await clients.matchAll();
    let authToken = null;

    // Try to get token from any open client
    for (const client of allClients) {
      // Can't directly access localStorage from SW, so we use a fallback
    }

    // Fetch pending notifications (public endpoint)
    const response = await fetch('/api/notifications/pending', {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
    });

    if (response.ok) {
      const notifications = await response.json();

      // Show each pending notification
      for (const notif of notifications) {
        await self.registration.showNotification(notif.title, {
          body: notif.body,
          icon: notif.icon || '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: { url: notif.url || '/dex/notifications' },
          tag: notif.id || 'pending-notification',
        });
      }
    }
  } catch (err) {
    console.error('[SW] Failed to fetch pending notifications:', err);
  }
}

// ============================================
// PERIODIC BACKGROUND SYNC - Check Even When Closed
// ============================================

// Handle periodic sync (runs periodically even when browser is closed)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'soundchain-check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }

  if (event.tag === 'soundchain-check-rewards') {
    event.waitUntil(checkForNewRewards());
  }
});

// Check for new notifications in background
async function checkForNewNotifications() {
  try {
    const response = await fetch('/api/notifications/check');

    if (response.ok) {
      const data = await response.json();

      if (data.hasNew && data.count > 0) {
        await self.registration.showNotification('SoundChain', {
          body: `You have ${data.count} new notification${data.count > 1 ? 's' : ''}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: { url: '/dex/notifications' },
          tag: 'new-notifications',
        });
      }
    }
  } catch (err) {
    // Silently fail - user might be offline
    console.log('[SW] Background notification check failed (offline?)');
  }
}

// Check for new streaming rewards in background
async function checkForNewRewards() {
  try {
    const response = await fetch('/api/rewards/check');

    if (response.ok) {
      const data = await response.json();

      if (data.newRewards > 0) {
        await self.registration.showNotification('OGUN Earned!', {
          body: `You earned ${data.newRewards.toFixed(2)} OGUN from streaming`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: { url: '/dex/staking' },
          tag: 'new-rewards',
        });
      }
    }
  } catch (err) {
    console.log('[SW] Background rewards check failed (offline?)');
  }
}

// ============================================
// MESSAGE HANDLING - Communication with main thread
// ============================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  const { type, payload } = event.data || {};

  switch (type) {
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(payload);
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'REGISTER_PERIODIC_SYNC':
      registerPeriodicSync(payload);
      break;
  }
});

// Queue an action for when back online
async function queueOfflineAction(action) {
  try {
    const cache = await caches.open(OFFLINE_QUEUE_NAME);
    const response = new Response(JSON.stringify(action));
    await cache.put(`/offline-action-${Date.now()}`, response);
    console.log('[SW] Queued offline action:', action.action);

    // Register sync to process when online
    await self.registration.sync.register('soundchain-sync');
  } catch (err) {
    console.error('[SW] Failed to queue offline action:', err);
  }
}

// Register periodic background sync
async function registerPeriodicSync(options) {
  try {
    const { tag, minInterval } = options;

    if ('periodicSync' in self.registration) {
      await self.registration.periodicSync.register(tag, {
        minInterval: minInterval || 60 * 60 * 1000, // Default: 1 hour
      });
      console.log('[SW] Registered periodic sync:', tag);
    }
  } catch (err) {
    console.error('[SW] Failed to register periodic sync:', err);
  }
}

// ============================================
// INSTALL & ACTIVATE
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing SoundChain service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SoundChain service worker...');

  event.waitUntil(
    Promise.all([
      // Take control of all pages immediately
      clients.claim(),

      // Register periodic syncs if supported
      (async () => {
        if ('periodicSync' in self.registration) {
          try {
            // Check notifications every hour
            await self.registration.periodicSync.register('soundchain-check-notifications', {
              minInterval: 60 * 60 * 1000, // 1 hour
            });

            // Check rewards every 30 minutes
            await self.registration.periodicSync.register('soundchain-check-rewards', {
              minInterval: 30 * 60 * 1000, // 30 minutes
            });

            console.log('[SW] Periodic syncs registered');
          } catch (err) {
            console.log('[SW] Periodic sync not available:', err.message);
          }
        }
      })(),
    ])
  );
});
