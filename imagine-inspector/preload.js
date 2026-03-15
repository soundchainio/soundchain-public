const { contextBridge, ipcRenderer } = require('electron')

// Safe IPC bridge — renderer can only call these specific methods
contextBridge.exposeInMainWorld('inspector', {
  // Receive captured network/console events from main process
  onCapture: (callback) => {
    ipcRenderer.on('capture', (_event, data) => callback(data))
  },

  // Receive status updates (debugger attached/detached, errors)
  onStatus: (callback) => {
    ipcRenderer.on('status', (_event, data) => callback(data))
  },

  // Control commands from renderer → main
  startCapture: () => ipcRenderer.send('start-capture'),
  stopCapture: () => ipcRenderer.send('stop-capture'),
  clearCaptures: () => ipcRenderer.send('clear-captures'),
  exportCaptures: () => ipcRenderer.invoke('export-captures'),

  // Navigate Grok view
  navigateTo: (url) => ipcRenderer.send('navigate-to', url),
  reload: () => ipcRenderer.send('reload-grok'),

  // Split pane control
  setSplit: (ratio) => ipcRenderer.send('set-split', ratio),
})
