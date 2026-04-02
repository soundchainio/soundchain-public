/**
 * GET /api/push/resubscribe — Returns an HTML page that re-registers push notifications
 *
 * Open this URL on any device to re-enable push alerts.
 * Handles the entire flow: permission request → service worker → subscribe → save to DB
 *
 * This is the fastest way to get flashlight alerts working on iPhone.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BJyVXuYo6LF6voKAShxlOo6V47M2R3RGCjKK_uQ6PA8T0ryyBE4qpYeKcY1k1UjO7VcEFvvIaSmsJWEcrN5eV3w'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/html')
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SoundChain Push Alerts</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a; color: white; font-family: -apple-system, system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: linear-gradient(135deg, #111 0%, #1a1a2e 100%);
      border: 1px solid rgba(34, 211, 238, 0.3);
      border-radius: 16px; padding: 32px; max-width: 400px; width: 100%;
      box-shadow: 0 0 30px rgba(34, 211, 238, 0.1);
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 24px; }
    .btn {
      width: 100%; padding: 16px; border: none; border-radius: 12px;
      font-size: 16px; font-weight: bold; cursor: pointer;
      background: linear-gradient(135deg, #22d3ee, #8b5cf6);
      color: white; margin-bottom: 12px;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.02); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-test {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
    }
    .status {
      padding: 12px; border-radius: 8px; margin-top: 16px;
      font-size: 13px; font-family: monospace;
    }
    .success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #22c55e; }
    .error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; }
    .info { background: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.3); color: #22d3ee; }
    .steps { margin-top: 16px; font-size: 12px; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ SoundChain Alerts</h1>
    <p class="subtitle">OGUN Trader + Pulse DMs → your phone lights up</p>

    <button class="btn" id="subscribeBtn" onclick="enablePush()">
      🔔 Enable Flash Alerts
    </button>

    <button class="btn btn-test" id="testBtn" onclick="testPush()" disabled>
      📱 Send Test Alert
    </button>

    <div id="status"></div>

    <div class="steps">
      <p>This will:</p>
      <p>1. Request notification permission</p>
      <p>2. Register the service worker</p>
      <p>3. Subscribe to push alerts</p>
      <p>4. Your phone flashes on every OGUN Trader buy/sell</p>
    </div>
  </div>

  <script>
    const VAPID_KEY = '${VAPID_PUBLIC_KEY}';

    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
      return outputArray;
    }

    function showStatus(msg, type) {
      document.getElementById('status').innerHTML = '<div class="status ' + type + '">' + msg + '</div>';
    }

    async function enablePush() {
      const btn = document.getElementById('subscribeBtn');
      btn.disabled = true;
      btn.textContent = '⏳ Setting up...';

      try {
        // 1. Check support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          showStatus('Push not supported in this browser. Use Safari PWA on iOS.', 'error');
          return;
        }

        // 2. Request permission
        showStatus('Requesting permission...', 'info');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showStatus('Permission denied. Go to Settings → Safari → soundchain.io → Allow Notifications', 'error');
          return;
        }

        // 3. Register service worker
        showStatus('Registering service worker...', 'info');
        const reg = await navigator.serviceWorker.register('/worker-bI0LKgsH63ulpIACgxl-u.js');
        await navigator.serviceWorker.ready;

        // 4. Subscribe to push
        showStatus('Subscribing to push...', 'info');
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });

        // 5. Save subscription to server via GraphQL
        showStatus('Saving to server...', 'info');
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];

        const response = await fetch('/api/push/save-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ' + token : '',
          },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
              auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
            },
            device: navigator.userAgent.includes('iPhone') ? 'iOS' :
                    navigator.userAgent.includes('Mac') ? 'Mac' : 'Device',
          }),
        });

        if (response.ok) {
          showStatus('✅ Push alerts ENABLED! Your phone will flash on trades.', 'success');
          document.getElementById('testBtn').disabled = false;
          btn.textContent = '✅ Enabled!';
        } else {
          // Try GraphQL mutation as fallback
          showStatus('Trying GraphQL subscription...', 'info');
          const subJson = sub.toJSON();
          const gqlRes = await fetch('https://api.soundchain.io/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? 'Bearer ' + token : '',
            },
            body: JSON.stringify({
              query: 'mutation($input: PushSubscriptionInput!) { subscribeToPush(input: $input) { id } }',
              variables: {
                input: {
                  endpoint: subJson.endpoint,
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                  deviceName: navigator.userAgent.includes('iPhone') ? 'iOS' : 'Mac',
                }
              }
            }),
          });

          if (gqlRes.ok) {
            showStatus('✅ Push alerts ENABLED via GraphQL! Flash alerts active.', 'success');
            document.getElementById('testBtn').disabled = false;
            btn.textContent = '✅ Enabled!';
          } else {
            showStatus('Subscription created in browser but server save failed. Try from the main site.', 'error');
          }
        }
      } catch (err) {
        showStatus('Error: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '🔔 Retry';
      }
    }

    async function testPush() {
      showStatus('Sending test alert...', 'info');
      const res = await fetch('/api/push/trade-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '📱 FLASH TEST — If your phone lit up, alerts are WORKING! OGUN Trader is armed.',
          type: 'buy'
        }),
      });
      if (res.ok) {
        showStatus('✅ Test sent! Check your phone — it should flash/vibrate NOW.', 'success');
      } else {
        showStatus('Test failed: ' + await res.text(), 'error');
      }
    }
  </script>
</body>
</html>
  `)
}
