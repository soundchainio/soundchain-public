const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// --- State ---
let mainWindow = null
let grokView = null
let capturing = false
let captures = []

// Domains to intercept — Grok/x.ai API traffic
const INTERCEPT_DOMAINS = [
  'x.ai',
  'grok.x.ai',
  'api.x.ai',
  'x.com',
  'api.x.com',
  'abs.twimg.com',
]

// Keywords that flag an entry as Imagine-related
const IMAGINE_KEYWORDS = [
  'imagine',
  'image',
  'generate',
  'aurora',
  'face',
  'grok',
  'create_image',
  'multimodal',
]

function isInterceptDomain(url) {
  try {
    const hostname = new URL(url).hostname
    return INTERCEPT_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

function isImagineRelated(entry) {
  const haystack = JSON.stringify(entry).toLowerCase()
  return IMAGINE_KEYWORDS.some((kw) => haystack.includes(kw))
}

function createTimestamp() {
  return new Date().toISOString()
}

// --- Main Window (Inspector UI) ---
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'Imagine Inspector',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile('index.html')

  // Create Grok BrowserView (left pane)
  grokView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Allow Grok's own scripts to run
      sandbox: false,
    },
  })

  mainWindow.setBrowserView(grokView)

  // Position: left 55% of window for Grok, right 45% for inspector
  const updateBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const { width, height } = mainWindow.getContentBounds()
    const grokWidth = Math.floor(width * 0.55)
    grokView.setBounds({ x: 0, y: 0, width: grokWidth, height })
  }

  updateBounds()
  mainWindow.on('resize', updateBounds)

  // Load Grok
  grokView.webContents.loadURL('https://x.com/i/grok')

  // Auto-start capture when Grok loads
  grokView.webContents.on('did-finish-load', () => {
    if (!capturing) {
      startCapture()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    grokView = null
  })
}

// --- CDP Debugger ---
function startCapture() {
  if (!grokView || capturing) return

  const wc = grokView.webContents

  try {
    wc.debugger.attach('1.3')
  } catch (err) {
    sendStatus({ type: 'error', message: `Failed to attach debugger: ${err.message}` })
    return
  }

  capturing = true
  sendStatus({ type: 'attached', message: 'CDP debugger attached — capturing traffic' })

  // Enable network + console monitoring
  wc.debugger.sendCommand('Network.enable', {
    maxTotalBufferSize: 10 * 1024 * 1024, // 10MB buffer for response bodies
  })
  wc.debugger.sendCommand('Console.enable')
  wc.debugger.sendCommand('Runtime.enable')
  wc.debugger.sendCommand('Network.setCacheDisabled', { cacheDisabled: false })

  // --- Stream Interception via Runtime.addBinding ---
  // CDP can't capture streaming Fetch response bodies (they show as ERR_ABORTED).
  // Solution: inject a fetch() wrapper that clones the response, reads the stream
  // chunk by chunk, and sends data back via a native binding.
  wc.debugger.sendCommand('Runtime.addBinding', { name: '_inspectorCapture' })

  // Inject fetch interceptor after each navigation
  const injectFetchInterceptor = () => {
    const script = `
      (function() {
        if (window.__inspectorPatched) return;
        window.__inspectorPatched = true;

        const originalFetch = window.fetch;
        const INTERCEPT_PATTERNS = [
          'add_response.json',
          'grok/generate',
          'imagine',
          'create_image',
        ];

        window.fetch = function(...args) {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
          const shouldIntercept = INTERCEPT_PATTERNS.some(p => url.includes(p));

          if (!shouldIntercept) {
            return originalFetch.apply(this, args);
          }

          const streamId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

          // Notify stream started
          window._inspectorCapture(JSON.stringify({
            type: 'stream-start',
            streamId: streamId,
            url: url,
            method: args[1]?.method || 'GET',
            timestamp: new Date().toISOString(),
          }));

          return originalFetch.apply(this, args).then(response => {
            // Clone response so Grok gets the original untouched stream
            const cloned = response.clone();

            // Read the cloned stream in background
            const reader = cloned.body.getReader();
            const decoder = new TextDecoder();
            let fullBody = '';
            let chunkIndex = 0;

            function readChunk() {
              return reader.read().then(({ done, value }) => {
                if (done) {
                  // Stream complete — send full body
                  window._inspectorCapture(JSON.stringify({
                    type: 'stream-end',
                    streamId: streamId,
                    url: url,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: fullBody,
                    totalChunks: chunkIndex,
                    timestamp: new Date().toISOString(),
                  }));
                  return;
                }

                const text = decoder.decode(value, { stream: true });
                fullBody += text;
                chunkIndex++;

                // Send individual chunks for real-time monitoring
                // Only send first 50 chunks to avoid flooding IPC
                if (chunkIndex <= 50) {
                  window._inspectorCapture(JSON.stringify({
                    type: 'stream-chunk',
                    streamId: streamId,
                    chunkIndex: chunkIndex,
                    data: text.substring(0, 10000),
                    timestamp: new Date().toISOString(),
                  }));
                }

                return readChunk();
              });
            }

            readChunk().catch(err => {
              window._inspectorCapture(JSON.stringify({
                type: 'stream-error',
                streamId: streamId,
                error: err.message || String(err),
                body: fullBody,
                timestamp: new Date().toISOString(),
              }));
            });

            // Return original response to Grok (untouched)
            return response;
          });
        };
      })();
    `
    wc.debugger
      .sendCommand('Runtime.evaluate', {
        expression: script,
        allowUnsafeEvalBlockedByCSP: true,
      })
      .then(() => {
        sendStatus({ type: 'injected', message: 'Fetch interceptor injected — streaming capture active' })
      })
      .catch((err) => {
        console.error('[Inspector] Failed to inject fetch interceptor:', err.message)
      })
  }

  // Inject on initial load and after each navigation
  injectFetchInterceptor()
  wc.on('did-finish-load', injectFetchInterceptor)
  wc.on('did-navigate-in-page', injectFetchInterceptor)

  // Track pending requests for response body retrieval
  const pendingRequests = new Map()

  wc.debugger.on('message', (_event, method, params) => {
    // --- Network: Request ---
    if (method === 'Network.requestWillBeSent') {
      const { requestId, request, type, initiator } = params
      const url = request.url

      if (!isInterceptDomain(url)) return

      pendingRequests.set(requestId, {
        url,
        method: request.method,
        headers: request.headers,
        postData: request.postData || null,
        type,
        initiator: initiator?.type || 'unknown',
        timestamp: createTimestamp(),
      })
    }

    // --- Network: Response ---
    if (method === 'Network.responseReceived') {
      const { requestId, response } = params
      const reqData = pendingRequests.get(requestId)
      if (!reqData) return

      reqData.status = response.status
      reqData.statusText = response.statusText
      reqData.responseHeaders = response.headers
      reqData.mimeType = response.mimeType
      reqData.timing = response.timing || null
    }

    // --- Network: Loading Finished → Get Response Body ---
    if (method === 'Network.loadingFinished') {
      const { requestId, encodedDataLength } = params
      const reqData = pendingRequests.get(requestId)
      if (!reqData) return

      reqData.encodedDataLength = encodedDataLength

      // Fetch response body
      wc.debugger
        .sendCommand('Network.getResponseBody', { requestId })
        .then(({ body, base64Encoded }) => {
          // Skip large binary blobs (images > 500KB)
          if (base64Encoded && body.length > 500_000) {
            reqData.responseBody = `[Binary data: ${Math.round(body.length / 1024)}KB, base64]`
            reqData.responseBodyTruncated = true
          } else {
            reqData.responseBody = body
            reqData.base64Encoded = base64Encoded
          }

          // Try to parse JSON response bodies
          if (!base64Encoded) {
            try {
              reqData.responseParsed = JSON.parse(body)
            } catch {
              // Not JSON, keep raw
            }
          }

          // Try to parse JSON request bodies
          if (reqData.postData) {
            try {
              reqData.postDataParsed = JSON.parse(reqData.postData)
            } catch {
              // Not JSON, keep raw
            }
          }

          finishCapture(reqData)
          pendingRequests.delete(requestId)
        })
        .catch(() => {
          // Body may not be available (e.g., redirects)
          finishCapture(reqData)
          pendingRequests.delete(requestId)
        })
    }

    // --- Network: Request Failed ---
    if (method === 'Network.loadingFailed') {
      const { requestId, errorText, canceled } = params
      const reqData = pendingRequests.get(requestId)
      if (!reqData) return

      reqData.error = errorText
      reqData.canceled = canceled
      finishCapture(reqData)
      pendingRequests.delete(requestId)
    }

    // --- Runtime.bindingCalled → Stream Captures ---
    if (method === 'Runtime.bindingCalled' && params.name === '_inspectorCapture') {
      try {
        const data = JSON.parse(params.payload)

        if (data.type === 'stream-end') {
          // Full stream response captured — this is the gold
          const entry = {
            captureType: 'stream',
            streamId: data.streamId,
            url: data.url,
            status: data.status,
            statusText: data.statusText,
            responseHeaders: data.headers,
            totalChunks: data.totalChunks,
            timestamp: data.timestamp,
            isImagineRelated: true,
          }

          // Parse the streaming body — Grok uses newline-delimited JSON (NDJSON)
          const rawBody = data.body || ''
          entry.responseBody = rawBody

          // Try to parse as NDJSON (one JSON object per line)
          const lines = rawBody.split('\n').filter((l) => l.trim())
          const parsed = []
          for (const line of lines) {
            try {
              parsed.push(JSON.parse(line))
            } catch {
              // Not JSON, keep as raw text
              parsed.push({ _raw: line })
            }
          }
          entry.responseParsed = parsed
          entry.ndJsonLineCount = parsed.length

          // Extract key fields from parsed NDJSON for quick view
          const imageUrls = []
          const textChunks = []
          for (const obj of parsed) {
            // Look for image URLs in various possible fields
            if (obj.imageUrl) imageUrls.push(obj.imageUrl)
            if (obj.image_url) imageUrls.push(obj.image_url)
            if (obj.result?.imageUrl) imageUrls.push(obj.result.imageUrl)
            if (obj.result?.media_url) imageUrls.push(obj.result.media_url)
            if (obj.result?.image_urls) imageUrls.push(...obj.result.image_urls)
            // Look for text/token responses
            if (obj.result?.message) textChunks.push(obj.result.message)
            if (obj.result?.token) textChunks.push(obj.result.token)
          }
          if (imageUrls.length > 0) entry.extractedImageUrls = imageUrls
          if (textChunks.length > 0) entry.extractedText = textChunks.join('')

          addCapture(entry)
        } else if (data.type === 'stream-chunk') {
          // Individual chunk — show in real-time
          const entry = {
            captureType: 'stream-chunk',
            streamId: data.streamId,
            chunkIndex: data.chunkIndex,
            data: data.data,
            timestamp: data.timestamp,
            isImagineRelated: true,
          }
          addCapture(entry)
        } else if (data.type === 'stream-start') {
          const entry = {
            captureType: 'stream-start',
            streamId: data.streamId,
            url: data.url,
            method: data.method,
            timestamp: data.timestamp,
            isImagineRelated: true,
          }
          addCapture(entry)
        } else if (data.type === 'stream-error') {
          const entry = {
            captureType: 'stream-error',
            streamId: data.streamId,
            error: data.error,
            responseBody: data.body,
            timestamp: data.timestamp,
            isImagineRelated: true,
          }
          addCapture(entry)
        }
      } catch (err) {
        console.error('[Inspector] Failed to parse binding payload:', err.message)
      }
    }

    // --- Console Messages ---
    if (method === 'Console.messageAdded') {
      const { message } = params
      const entry = {
        captureType: 'console',
        level: message.level,
        text: message.text,
        url: message.url,
        line: message.line,
        timestamp: createTimestamp(),
      }

      if (isImagineRelated(entry)) {
        entry.isImagineRelated = true
      }

      addCapture(entry)
    }

    // --- WebSocket frames (future: Grok may use WS for streaming) ---
    if (method === 'Network.webSocketFrameReceived' || method === 'Network.webSocketFrameSent') {
      const { requestId, response: frame } = params
      const direction = method.includes('Sent') ? 'sent' : 'received'

      // Only capture text frames that look API-related
      if (frame && frame.payloadData && frame.payloadData.length < 100_000) {
        const entry = {
          captureType: 'websocket',
          direction,
          requestId,
          payloadData: frame.payloadData,
          timestamp: createTimestamp(),
        }

        // Try parse as JSON
        try {
          entry.parsed = JSON.parse(frame.payloadData)
        } catch {
          // Raw text
        }

        if (isImagineRelated(entry)) {
          entry.isImagineRelated = true
          addCapture(entry)
        }
      }
    }
  })

  wc.debugger.on('detach', (_event, reason) => {
    capturing = false
    sendStatus({ type: 'detached', message: `Debugger detached: ${reason}` })
  })
}

function finishCapture(reqData) {
  const entry = {
    captureType: 'network',
    ...reqData,
    isImagineRelated: isImagineRelated(reqData),
  }
  addCapture(entry)
}

function addCapture(entry) {
  captures.push(entry)

  // Cap at 5000 entries
  if (captures.length > 5000) {
    captures = captures.slice(-4000)
  }

  // Forward to renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('capture', entry)
  }
}

function stopCapture() {
  if (!grokView || !capturing) return

  try {
    grokView.webContents.debugger.detach()
  } catch {
    // Already detached
  }
  capturing = false
  sendStatus({ type: 'stopped', message: 'Capture stopped' })
}

function sendStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', status)
  }
}

// --- IPC Handlers ---
ipcMain.on('start-capture', () => startCapture())
ipcMain.on('stop-capture', () => stopCapture())
ipcMain.on('clear-captures', () => {
  captures = []
  sendStatus({ type: 'cleared', message: 'Captures cleared' })
})

ipcMain.handle('export-captures', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Captures',
    defaultPath: `imagine-captures-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (!filePath) return { success: false, reason: 'cancelled' }

  // Filter to Imagine-related entries for cleaner export
  const imagineCaptures = captures.filter((c) => c.isImagineRelated)
  const exportData = {
    exportedAt: createTimestamp(),
    totalCaptures: captures.length,
    imagineCaptures: imagineCaptures.length,
    captures: imagineCaptures.length > 0 ? imagineCaptures : captures,
  }

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2))
  return { success: true, path: filePath, count: exportData.captures.length }
})

ipcMain.on('navigate-to', (_event, url) => {
  if (grokView) {
    grokView.webContents.loadURL(url)
  }
})

ipcMain.on('reload-grok', () => {
  if (grokView) {
    grokView.webContents.reload()
  }
})

// --- App Lifecycle ---
app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
