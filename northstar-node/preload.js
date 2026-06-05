// Safe bridge between the sandboxed renderer and the node's local engine.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('northstar', {
  me: () => ipcRenderer.invoke('me:get'),
  getPosts: () => ipcRenderer.invoke('posts:get'),
  getPeers: () => ipcRenderer.invoke('peers:get'),
  createPost: (text) => ipcRenderer.invoke('post:create', text),
  onPost: (cb) => ipcRenderer.on('post:new', (_e, post) => cb(post)),
  onPeers: (cb) => ipcRenderer.on('peers:update', (_e, peers) => cb(peers)),
})

contextBridge.exposeInMainWorld('passActivation', {
  state: () => ipcRenderer.invoke('activation:state'),
  challenge: () => ipcRenderer.invoke('activation:challenge'),
  verify: (signature) => ipcRenderer.invoke('activation:verify', signature),
  continueBeta: () => ipcRenderer.invoke('activation:continueBeta'),
  enterApp: () => ipcRenderer.invoke('activation:enterApp'),
  openBuy: () => ipcRenderer.invoke('activation:openBuy'),
})
