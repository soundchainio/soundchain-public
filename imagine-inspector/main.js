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
  'grok.com',
  'api.grok.com',
  'abs.twimg.com',
]

// Persist session data (cookies, localStorage) so user stays logged in
const SESSION_DIR = path.join(app.getPath('userData'), 'grok-session')

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

  // Create Grok BrowserView (left pane) with persistent session
  grokView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Persist cookies/localStorage between sessions so user stays logged in
      partition: 'persist:grok',
    },
  })

  mainWindow.setBrowserView(grokView)

  // Split ratio — adjustable via IPC from renderer
  let splitRatio = 0.50 // 50/50 default

  const updateBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || !grokView) return
    const { width, height } = mainWindow.getContentBounds()
    const grokWidth = Math.floor(width * splitRatio)
    grokView.setBounds({ x: 0, y: 0, width: grokWidth, height })
  }

  updateBounds()
  mainWindow.on('resize', updateBounds)

  // Listen for split ratio changes from renderer
  ipcMain.on('set-split', (_event, ratio) => {
    splitRatio = ratio
    updateBounds()
  })

  // Load Grok standalone (not X/Twitter — supports standalone Grok accounts)
  grokView.webContents.loadURL('https://grok.com')

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

  // --- Stream Interception via Page.addScriptToEvaluateOnNewDocument ---
  // Previous approaches failed:
  //   1. Patching window.fetch via Runtime.evaluate → SW intercepts fetch first
  //   2. Patching ReadableStream.getReader via Runtime.evaluate → runs too late,
  //      X.com's code already cached the original getReader reference
  //
  // This approach uses Page.addScriptToEvaluateOnNewDocument which injects our
  // patch into the MAIN WORLD *before* ANY page JavaScript loads. X.com's code
  // can't cache the original because our patch IS the original at load time.
  //
  // We also set up Runtime.addBinding for the IPC channel back to main process.
  wc.debugger.sendCommand('Runtime.addBinding', { name: '_inspectorCapture' })
  wc.debugger.sendCommand('Page.enable')

  // The script that patches ReadableStream.getReader BEFORE page JS loads
  const streamInterceptorScript = `
    (function() {
      // === DIAGNOSTIC: confirm this script actually runs ===
      console.log('[Imagine Inspector] Stream interceptor injecting into main world...');

      const INTERCEPT_PATTERNS = [
        'add_response.json',
        'grok/generate',
        'imagine',
        'create_image',
      ];

      // === LAYER 1: Patch fetch() to TAG response bodies with URL ===
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
        const method = args[1]?.method || (args[0]?.method) || 'GET';
        const shouldTag = INTERCEPT_PATTERNS.some(p => url.includes(p));

        return originalFetch.apply(this, args).then(response => {
          if (shouldTag && response.body) {
            response.body.__iUrl = url;
            response.body.__iMethod = method;
            response.body.__iStatus = response.status;
            response.body.__iStatusText = response.statusText || '';
            try {
              response.body.__iHeaders = Object.fromEntries(response.headers.entries());
            } catch(e) {
              response.body.__iHeaders = {};
            }
            console.log('[Imagine Inspector] Tagged stream for:', url);
          }
          return response;
        }).catch(err => {
          // Don't break fetch on errors
          throw err;
        });
      };

      // === LAYER 2: Patch ReadableStream.prototype.getReader ===
      // Runs BEFORE X.com's code loads, so they get our patched version
      const originalGetReader = ReadableStream.prototype.getReader;

      ReadableStream.prototype.getReader = function(opts) {
        const url = this.__iUrl;

        if (!url) {
          return originalGetReader.call(this, opts);
        }

        // Grab and clear metadata
        const method = this.__iMethod || 'GET';
        const status = this.__iStatus || 0;
        const statusText = this.__iStatusText || '';
        const headers = this.__iHeaders || {};
        delete this.__iUrl;
        delete this.__iMethod;
        delete this.__iStatus;
        delete this.__iStatusText;
        delete this.__iHeaders;

        const streamId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        console.log('[Imagine Inspector] Intercepting stream:', url, 'id:', streamId);

        // Send IPC via console.debug with magic prefix — always available,
        // unlike Runtime.addBinding which has timing issues with pre-load scripts
        function sendCapture(data) {
          console.debug('__INSPECTOR_CAPTURE__' + JSON.stringify(data));
        }

        // Notify stream started
        sendCapture({
          type: 'stream-start',
          streamId: streamId,
          url: url,
          method: method,
          timestamp: new Date().toISOString(),
        });

        // Tee the stream
        const [consumerBranch, inspectorBranch] = this.tee();

        // Read inspector branch in background
        const inspectorReader = originalGetReader.call(inspectorBranch);
        const decoder = new TextDecoder();
        let fullBody = '';
        let chunkIndex = 0;

        function readChunk() {
          return inspectorReader.read().then(({ done, value }) => {
            if (done) {
              const body = fullBody.length > 2_000_000
                ? fullBody.substring(0, 2_000_000) + '\\n[TRUNCATED]'
                : fullBody;
              sendCapture({
                type: 'stream-end',
                streamId: streamId,
                url: url,
                status: status,
                statusText: statusText,
                headers: headers,
                body: body,
                totalChunks: chunkIndex,
                timestamp: new Date().toISOString(),
              });
              console.log('[Imagine Inspector] Stream complete:', url, chunkIndex, 'chunks,', fullBody.length, 'bytes');
              return;
            }

            const text = decoder.decode(value, { stream: true });
            fullBody += text;
            chunkIndex++;

            if (chunkIndex <= 30) {
              sendCapture({
                type: 'stream-chunk',
                streamId: streamId,
                chunkIndex: chunkIndex,
                data: text.substring(0, 10000),
                timestamp: new Date().toISOString(),
              });
            }

            return readChunk();
          });
        }

        readChunk().catch(err => {
          sendCapture({
            type: 'stream-error',
            streamId: streamId,
            error: err.message || String(err),
            body: fullBody,
            timestamp: new Date().toISOString(),
          });
        });

        // Return consumer branch to Grok
        return originalGetReader.call(consumerBranch, opts);
      };

      console.log('[Imagine Inspector] ReadableStream.getReader patched successfully (pre-page-load)');
    })();
  `

  // Inject BEFORE any page JavaScript loads — this is the key difference
  // from Runtime.evaluate which runs AFTER page JS has already loaded.
  wc.debugger
    .sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source: streamInterceptorScript,
      worldName: '', // empty = main world (not isolated)
    })
    .then(({ identifier }) => {
      console.log('[Inspector] Pre-load script registered, id:', identifier)
      sendStatus({ type: 'injected', message: 'Pre-load stream interceptor registered — will activate on next page load' })
    })
    .catch((err) => {
      console.error('[Inspector] Failed to register pre-load script:', err.message)
      // Fallback: try Runtime.evaluate (less reliable but worth trying)
      wc.debugger
        .sendCommand('Runtime.evaluate', {
          expression: streamInterceptorScript,
          allowUnsafeEvalBlockedByCSP: true,
        })
        .then(() => sendStatus({ type: 'injected', message: 'Stream interceptor injected via fallback' }))
        .catch((e) => console.error('[Inspector] Fallback injection also failed:', e.message))
    })

  // Force a reload so the pre-load script takes effect on the fresh page
  // (the script only runs on NEW document loads)
  setTimeout(() => {
    if (grokView && !grokView.webContents.isDestroyed()) {
      console.log('[Inspector] Reloading Grok to activate pre-load interceptor...')
      grokView.webContents.reload()
    }
  }, 1500)

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

    // --- Console Messages (also handles stream capture IPC via magic prefix) ---
    if (method === 'Console.messageAdded') {
      const { message } = params
      const text = message.text || ''

      // Check for stream capture IPC via console.debug with magic prefix
      const CAPTURE_PREFIX = '__INSPECTOR_CAPTURE__'
      if (text.startsWith(CAPTURE_PREFIX)) {
        try {
          const data = JSON.parse(text.slice(CAPTURE_PREFIX.length))

          if (data.type === 'stream-end') {
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

            const rawBody = data.body || ''
            entry.responseBody = rawBody

            // Parse as NDJSON
            const lines = rawBody.split('\n').filter((l) => l.trim())
            const parsed = []
            for (const line of lines) {
              try { parsed.push(JSON.parse(line)) } catch { parsed.push({ _raw: line }) }
            }
            entry.responseParsed = parsed
            entry.ndJsonLineCount = parsed.length

            // Extract image URLs
            const imageUrls = []
            const textChunks = []
            for (const obj of parsed) {
              if (obj.imageUrl) imageUrls.push(obj.imageUrl)
              if (obj.image_url) imageUrls.push(obj.image_url)
              if (obj.result?.imageUrl) imageUrls.push(obj.result.imageUrl)
              if (obj.result?.media_url) imageUrls.push(obj.result.media_url)
              if (obj.result?.image_urls) imageUrls.push(...obj.result.image_urls)
              if (obj.result?.message) textChunks.push(obj.result.message)
              if (obj.result?.token) textChunks.push(obj.result.token)
            }
            if (imageUrls.length > 0) entry.extractedImageUrls = imageUrls
            if (textChunks.length > 0) entry.extractedText = textChunks.join('')

            addCapture(entry)
          } else if (data.type === 'stream-chunk') {
            addCapture({
              captureType: 'stream-chunk',
              streamId: data.streamId,
              chunkIndex: data.chunkIndex,
              data: data.data,
              timestamp: data.timestamp,
              isImagineRelated: true,
            })
          } else if (data.type === 'stream-start') {
            addCapture({
              captureType: 'stream-start',
              streamId: data.streamId,
              url: data.url,
              method: data.method,
              timestamp: data.timestamp,
              isImagineRelated: true,
            })
          } else if (data.type === 'stream-error') {
            addCapture({
              captureType: 'stream-error',
              streamId: data.streamId,
              error: data.error,
              responseBody: data.body,
              timestamp: data.timestamp,
              isImagineRelated: true,
            })
          }
        } catch (err) {
          console.error('[Inspector] Failed to parse capture IPC:', err.message)
        }
        return // Don't also log as a regular console message
      }

      const entry = {
        captureType: 'console',
        level: message.level,
        text: text,
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

// --- Scrape Grok Imagine History ---
ipcMain.handle('scrape-history', async () => {
  if (!grokView) return { success: false, error: 'No Grok view' }

  sendStatus({ type: 'scraping', message: 'Scraping Grok Imagine history...' })

  try {
    // Inject scraper script into the Grok page using their logged-in session
    const result = await grokView.webContents.executeJavaScript(`
      (async function() {
        const results = { conversations: [], errors: [], imageCount: 0, apiDebug: {} };

        try {
          // Step 1: Fetch conversation list using the correct grok.com API
          // From captures we know: /rest/app-chat/conversations?pageSize=60 works
          const listEndpoints = [
            '/rest/app-chat/conversations?pageSize=200',
            '/rest/app-chat/conversations?pageSize=60',
            '/rest/grok/conversations',
          ];

          let allConversations = [];

          for (const ep of listEndpoints) {
            try {
              const resp = await fetch(ep, { credentials: 'include' });
              if (resp.ok) {
                const contentType = resp.headers.get('content-type') || '';
                if (!contentType.includes('json')) {
                  results.errors.push(ep + ' returned ' + contentType + ' (not JSON)');
                  continue;
                }
                const data = await resp.json();
                results.apiDebug.listEndpoint = ep;
                results.apiDebug.listResponseKeys = Object.keys(data);
                results.apiDebug.listResponseSample = JSON.stringify(data).substring(0, 2000);

                // Extract conversation array from various possible structures
                allConversations = Array.isArray(data) ? data
                  : data.conversations || data.items || data.data
                  || data.chats || data.results || data.history || [];

                if (!Array.isArray(allConversations)) {
                  // Maybe each key is a conversation
                  allConversations = Object.values(data).filter(v => typeof v === 'object' && v !== null);
                }

                results.apiDebug.conversationCount = allConversations.length;
                if (allConversations.length > 0) {
                  results.apiDebug.sampleConvKeys = Object.keys(allConversations[0]);
                  results.apiDebug.sampleConv = JSON.stringify(allConversations[0]).substring(0, 1000);
                }
                break;
              } else {
                results.errors.push(ep + ' returned ' + resp.status);
              }
            } catch(e) {
              results.errors.push(ep + ': ' + e.message);
            }
          }

          results.totalConversations = allConversations.length;

          // Step 2: Process each conversation — fetch actual messages
          for (const conv of allConversations.slice(0, 200)) {
            const id = conv.conversationId || conv.id || conv.conversation_id || conv.chatId;
            const convData = {
              id: id,
              title: conv.title || conv.name || conv.summary || 'Untitled',
              createdAt: conv.createdAt || conv.created_at || conv.timestamp || conv.createTime,
              updatedAt: conv.updatedAt || conv.updated_at || conv.updateTime || conv.modifyTime,
              messages: [],
              images: [],
              source: 'api-list',
            };

            // Include raw conversation metadata for debugging
            convData.rawKeys = Object.keys(conv);

            // Check if conversation object itself contains messages inline
            const inlineMessages = conv.messages || conv.responses || conv.turns || [];
            if (Array.isArray(inlineMessages) && inlineMessages.length > 0) {
              for (const msg of inlineMessages) {
                processMessage(msg, convData, results);
              }
            }

            // Try to fetch conversation MESSAGES (not just metadata)
            if (convData.messages.length === 0 && id) {
              // Try message-specific endpoints first, then fall back to conversation detail
              const messageEndpoints = [
                // Message history endpoints (most likely)
                { url: '/rest/app-chat/conversations/' + id + '/responses', method: 'GET' },
                { url: '/rest/app-chat/conversations/' + id + '/messages', method: 'GET' },
                { url: '/rest/app-chat/conversations/' + id + '/history', method: 'GET' },
                // POST-based message fetch (some APIs use POST for retrieval)
                { url: '/rest/app-chat/conversations/' + id + '/responses', method: 'POST',
                  body: JSON.stringify({ conversationId: id }) },
                // Conversation detail (metadata only, but try for nested messages)
                { url: '/rest/app-chat/conversations/' + id, method: 'GET' },
              ];

              for (const ep of messageEndpoints) {
                try {
                  const fetchOpts = { credentials: 'include', method: ep.method };
                  if (ep.body) {
                    fetchOpts.headers = { 'Content-Type': 'application/json' };
                    fetchOpts.body = ep.body;
                  }
                  const resp = await fetch(ep.url, fetchOpts);
                  const ct = resp.headers.get('content-type') || '';

                  if (resp.ok && ct.includes('json')) {
                    const rawText = await resp.text();

                    // Try parsing as regular JSON first
                    let data;
                    try {
                      data = JSON.parse(rawText);
                    } catch(e) {
                      // Try NDJSON (newline-delimited JSON) — Grok uses this for streaming
                      const lines = rawText.split('\\n').filter(l => l.trim());
                      data = [];
                      for (const line of lines) {
                        try { data.push(JSON.parse(line)); } catch(e2) {}
                      }
                    }

                    if (!data) continue;

                    // Store debug info for first conversation
                    if (!results.apiDebug.messageEndpoint) {
                      results.apiDebug.messageEndpoint = ep.url;
                      results.apiDebug.messageMethod = ep.method;
                      results.apiDebug.messageResponseSample = rawText.substring(0, 3000);
                      if (typeof data === 'object' && !Array.isArray(data)) {
                        results.apiDebug.messageResponseKeys = Object.keys(data);
                      }
                    }

                    // Extract messages from various response structures
                    let messages = [];
                    if (Array.isArray(data)) {
                      messages = data;
                    } else if (typeof data === 'object') {
                      messages = data.messages || data.responses || data.turns
                        || data.history || data.data || data.items || data.results || [];
                      if (!Array.isArray(messages)) messages = [];

                      // Also check for nested modelResponse / userQuery patterns
                      if (messages.length === 0) {
                        // Some APIs return {modelResponse: {...}, query: "..."}
                        if (data.modelResponse || data.response || data.query || data.userMessage) {
                          messages = [data];
                        }
                      }
                    }

                    for (const msg of messages) {
                      processMessage(msg, convData, results);
                    }

                    if (convData.messages.length > 0) {
                      convData.source = 'api-messages';
                      convData.messageEndpoint = ep.url;
                      break;
                    }

                    // Even if no messages extracted, check for image URLs in raw text
                    const imgMatches = rawText.match(/https:\/\/[^"\\s]*imagine-public[^"\\s]*/g);
                    if (imgMatches && imgMatches.length > 0) {
                      for (const imgUrl of imgMatches) {
                        convData.images.push(imgUrl);
                        results.imageCount++;
                      }
                      convData.source = 'api-raw-parse';
                      convData.messageEndpoint = ep.url;
                      break;
                    }
                  } else if (resp.ok && (ct.includes('text') || ct.includes('html'))) {
                    // HTML response — scan for image URLs
                    const html = await resp.text();
                    const imgMatches = html.match(/https:\/\/[^"'\\s]*imagine-public[^"'\\s]*/g);
                    if (imgMatches && imgMatches.length > 0) {
                      for (const imgUrl of [...new Set(imgMatches)]) {
                        convData.images.push(imgUrl);
                        results.imageCount++;
                      }
                      convData.source = 'html-parse';
                      break;
                    }
                  }
                } catch(e) {
                  // Try next endpoint
                }
              }

              // Rate limit protection — don't hammer the API
              await new Promise(r => setTimeout(r, 200));
            }

            results.conversations.push(convData);
          }

          // Step 3: DOM scrape — grab ALL visible images and conversation links
          const domImages = [];
          // Grab imagine-public images (generated images/videos)
          document.querySelectorAll('img[src*="imagine-public"], img[src*="x.ai/imagine"]').forEach(img => {
            if (img.src && !img.src.includes('analytics') && !img.src.includes('adsct')) {
              domImages.push({
                url: img.src,
                alt: img.alt || '',
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            }
          });
          // Also grab video elements with imagine sources
          document.querySelectorAll('video source[src*="imagine-public"], video[src*="imagine-public"]').forEach(vid => {
            const src = vid.src || vid.getAttribute('src');
            if (src) {
              domImages.push({
                url: src,
                alt: 'video',
                type: 'video',
              });
            }
          });
          results.domImages = domImages;
          results.domImageCount = domImages.length;

          // Grab conversation sidebar links for potential navigation
          const convLinks = [];
          document.querySelectorAll('a[href*="/conversation/"], a[href*="conversationId"]').forEach(a => {
            convLinks.push({ href: a.href, text: (a.textContent || '').trim().substring(0, 100) });
          });
          results.domConversationLinks = convLinks;

        } catch(e) {
          results.errors.push('Top-level: ' + e.message + ' ' + e.stack);
        }

        return results;

        // Helper to extract message data from various Grok response formats
        function processMessage(msg, convData, results) {
          if (!msg || typeof msg !== 'object') return;

          const msgData = {
            role: msg.role || msg.sender || msg.type
              || (msg.isUser ? 'user' : (msg.isModelResponse ? 'assistant' : undefined))
              || (msg.query ? 'user' : (msg.modelResponse ? 'assistant' : 'unknown')),
            text: msg.message || msg.text || msg.content || msg.query
              || msg.userMessage || msg.modelResponse || msg.response || '',
          };

          // Handle nested response structures
          if (msg.modelResponse && typeof msg.modelResponse === 'object') {
            msgData.text = msg.modelResponse.message || msg.modelResponse.text
              || msg.modelResponse.content || JSON.stringify(msg.modelResponse).substring(0, 2000);
          }

          // Extract prompt/query for user messages
          if (msg.query || msg.userMessage || msg.prompt) {
            msgData.prompt = msg.query || msg.userMessage || msg.prompt;
          }

          // Extract all possible image attachment formats
          const attSources = [
            msg.attachments, msg.fileAttachments, msg.images,
            msg.media, msg.mediaAttachments, msg.generatedImages,
            msg.imageAttachments, msg.mediaUrls, msg.outputImages,
            msg.result?.images, msg.result?.media,
          ];

          // Also check for single image fields
          const singleImageUrls = [
            msg.imageUrl, msg.image_url, msg.thumbnailUrl,
            msg.mediaUrl, msg.media_url, msg.shareUrl,
            msg.result?.imageUrl, msg.result?.media_url,
            msg.result?.thumbnailUrl, msg.result?.shareUrl,
          ];

          for (const imgUrl of singleImageUrls) {
            if (imgUrl && typeof imgUrl === 'string') {
              msgData.images = msgData.images || [];
              msgData.images.push({ url: imgUrl });
              convData.images.push(imgUrl);
              results.imageCount++;
            }
          }

          for (const atts of attSources) {
            if (!Array.isArray(atts)) continue;
            for (const att of atts) {
              if (typeof att === 'string') {
                // Array of URL strings
                msgData.images = msgData.images || [];
                msgData.images.push({ url: att });
                convData.images.push(att);
                results.imageCount++;
                continue;
              }
              const imgUrl = att.imageUrl || att.url || att.media_url
                || att.thumbnailUrl || att.src || att.shareUrl
                || att.mediaUrl || att.image_url;
              if (imgUrl) {
                msgData.images = msgData.images || [];
                msgData.images.push({
                  url: imgUrl,
                  width: att.width, height: att.height,
                  mediaId: att.mediaId || att.id,
                  type: att.type || att.mediaType,
                });
                convData.images.push(imgUrl);
                results.imageCount++;
              }
            }
          }

          // Scan raw message JSON for imagine-public URLs as last resort
          if (!msgData.images || msgData.images.length === 0) {
            const rawStr = JSON.stringify(msg);
            const imgMatches = rawStr.match(/https:\/\/[^"\\s]*imagine-public[^"\\s]*/g);
            if (imgMatches) {
              msgData.images = [];
              for (const url of [...new Set(imgMatches)]) {
                msgData.images.push({ url: url, source: 'raw-scan' });
                convData.images.push(url);
                results.imageCount++;
              }
            }
          }

          // Only add messages that have actual content
          if (msgData.text || msgData.prompt || (msgData.images && msgData.images.length > 0)) {
            convData.messages.push(msgData);
          }
        }
      })()
    `)

    // Save results to file
    const exportPath = path.join(
      app.getPath('downloads'),
      `grok-imagine-history-${Date.now()}.json`
    )
    fs.writeFileSync(exportPath, JSON.stringify(result, null, 2))

    sendStatus({
      type: 'scraped',
      message: `Scraped ${result.conversations?.length || 0} conversations, ${result.imageCount || 0} images → ${exportPath}`,
    })

    return {
      success: true,
      path: exportPath,
      conversations: result.conversations?.length || 0,
      images: result.imageCount || 0,
      errors: result.errors || [],
    }
  } catch (err) {
    sendStatus({ type: 'error', message: `Scrape failed: ${err.message}` })
    return { success: false, error: err.message }
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
