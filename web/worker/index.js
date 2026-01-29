/**
 * SoundChain Custom Service Worker Handlers
 * This file is bundled with next-pwa's generated service worker
 */

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
    // Custom action handling can be added here
  }

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // If no window is open, open a new one
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
