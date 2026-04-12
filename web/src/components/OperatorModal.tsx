/**
 * OperatorModal — Decentralized File Transfer Agent
 *
 * The FileZilla killer. Direct device-to-device file transfer via
 * WebRTC DataChannel. No server in the data path, no subscription,
 * no app download. DTLS encrypted. Optional IPFS backup.
 *
 * Uses SoundChain's existing WebRTC infra:
 * - Signaling: Pulse gateway (tunnel.soundchain.io)
 * - NAT traversal: Google STUN + SoundChain TURN (EC2)
 * - Transfer: RTCDataChannel (ordered, reliable)
 *
 * Floats alongside FURL (terminal) and Neural (brain scanner).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Minimize2, Maximize2, Upload, Download, Wifi, WifiOff, FileIcon, CheckCircle2, AlertCircle, Loader2, HardDrive, Send } from 'lucide-react'
import { useMe } from 'hooks/useMe'
import { useOperatorTransfer, type TransferFile } from 'hooks/useOperatorTransfer'
import { useOpenClawGateway } from 'hooks/useOpenClawGateway'

interface OperatorModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

export function OperatorModal({ isOpen, onClose }: OperatorModalProps) {
  const me = useMe()
  const [fullscreen, setFullscreen] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gateway for signaling (same one Pulse uses)
  const gateway = useOpenClawGateway(me?.profile?.id || null)

  const {
    state,
    direction,
    currentFile,
    connectedPeer,
    sendFile,
    startListening,
    cleanup,
  } = useOperatorTransfer({
    myId: me?.profile?.id || '',
    myName: me?.profile?.displayName || me?.handle || 'User',
    gateway,
    onFileReceived: (file) => {
      console.log('[Operator] File received:', file.name, formatBytes(file.size))
    },
  })

  // Start listening for incoming transfers when modal opens
  useEffect(() => {
    if (isOpen && me?.profile?.id && gateway?.connected) {
      startListening()
    }
    return () => { /* cleanup handled by hook */ }
  }, [isOpen, me?.profile?.id, gateway?.connected, startListening])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleSend = useCallback(async () => {
    if (!selectedFile || !recipientId.trim()) return
    await sendFile(selectedFile, recipientId.trim(), recipientName.trim() || recipientId.trim())
  }, [selectedFile, recipientId, recipientName, sendFile])

  const handleReset = useCallback(() => {
    cleanup()
    setSelectedFile(null)
    setRecipientId('')
    setRecipientName('')
  }, [cleanup])

  if (!isOpen) return null

  const isConnected = gateway?.connected

  return (
    <div
      className={`${
        fullscreen
          ? 'fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col'
          : 'fixed bottom-20 left-3 z-[100] w-[280px] sm:w-[320px] rounded-xl overflow-hidden border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]'
      }`}
      style={!fullscreen ? { background: 'linear-gradient(180deg, rgba(5,20,10,0.97) 0%, rgba(0,10,5,0.97) 100%)' } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/20 bg-black/50">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-green-400" />
          <span className="text-[10px] font-mono font-bold text-green-300 tracking-wider">OPERATOR</span>
          {isConnected ? (
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </span>
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-green-500/20 transition-colors">
            {fullscreen ? <Minimize2 className="w-3 h-3 text-gray-400" /> : <Maximize2 className="w-3 h-3 text-gray-400" />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-500/20 transition-colors">
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`overflow-y-auto scrollbar-hide ${fullscreen ? 'flex-1' : 'max-h-[450px]'}`}>
        {/* Status bar */}
        {!me ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-500">Log in to use Operator</p>
          </div>
        ) : !isConnected ? (
          <div className="px-3 py-4 text-center">
            <WifiOff className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Connecting to relay...</p>
            <p className="text-[9px] text-gray-600 mt-1">Signaling via tunnel.soundchain.io</p>
          </div>
        ) : state === 'idle' ? (
          <>
            {/* Send Section */}
            <div className="p-3 border-b border-green-500/10">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Upload className="w-3 h-3" />
                SEND FILE
              </div>

              {/* File drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-green-400 bg-green-500/10'
                    : selectedFile
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-gray-700 hover:border-green-500/30 hover:bg-green-500/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs text-white font-medium truncate">{selectedFile.name}</div>
                      <div className="text-[9px] text-gray-500">{formatBytes(selectedFile.size)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500">Drop a file or tap to browse</p>
                    <p className="text-[8px] text-gray-700 mt-0.5">Any file type. Direct device-to-device.</p>
                  </>
                )}
              </div>

              {/* Recipient input */}
              {selectedFile && (
                <div className="mt-2 space-y-1.5">
                  <input
                    type="text"
                    placeholder="Recipient @handle or profile ID"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Recipient profile ID (from their profile URL)"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500 font-mono"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!recipientId.trim()}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:from-green-400 hover:to-emerald-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to Device
                  </button>
                </div>
              )}
            </div>

            {/* Receive Section */}
            <div className="p-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Download className="w-3 h-3" />
                RECEIVE
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
                <Loader2 className="w-5 h-5 text-green-400/50 mx-auto mb-1 animate-spin" style={{ animationDuration: '3s' }} />
                <p className="text-[10px] text-green-400/60">Listening for incoming transfers</p>
                <p className="text-[8px] text-gray-600 mt-0.5">Other devices can send files to you</p>
              </div>
            </div>

            {/* Info */}
            <div className="px-3 pb-3">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-2.5 space-y-1">
                <p className="text-[8px] text-gray-500 font-mono">How it works:</p>
                <p className="text-[8px] text-gray-600">1. Both devices open Operator on soundchain.io</p>
                <p className="text-[8px] text-gray-600">2. Sender picks file + enters recipient ID</p>
                <p className="text-[8px] text-gray-600">3. WebRTC DataChannel transfers directly</p>
                <p className="text-[8px] text-gray-600">4. No cloud. No server. DTLS encrypted.</p>
              </div>
            </div>
          </>
        ) : (
          /* Active transfer */
          <div className="p-3">
            {/* Transfer progress */}
            {currentFile && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {state === 'complete' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                  ) : state === 'error' ? (
                    <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-green-400 flex-shrink-0 animate-spin" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{currentFile.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {formatBytes(currentFile.size)}
                      {direction === 'send' ? ' sending' : ' receiving'}
                      {connectedPeer ? ` ${direction === 'send' ? 'to' : 'from'} ${connectedPeer.name}` : ''}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        state === 'complete' ? 'bg-green-400' : state === 'error' ? 'bg-red-400' : 'bg-gradient-to-r from-green-400 to-emerald-500'
                      }`}
                      style={{ width: `${currentFile.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>{currentFile.progress}%</span>
                    <span>{currentFile.speed ? formatSpeed(currentFile.speed) : ''}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center">
                  {state === 'connecting' && (
                    <p className="text-xs text-yellow-400">Establishing WebRTC connection...</p>
                  )}
                  {state === 'transferring' && (
                    <p className="text-xs text-green-400">Transfer in progress</p>
                  )}
                  {state === 'complete' && (
                    <div className="space-y-2">
                      <p className="text-xs text-green-400">Transfer complete</p>
                      {direction === 'receive' && (
                        <p className="text-[9px] text-gray-500">File saved to your Downloads folder</p>
                      )}
                    </div>
                  )}
                  {state === 'error' && (
                    <p className="text-xs text-red-400">Transfer failed — connection dropped</p>
                  )}
                </div>

                {/* Reset button */}
                {(state === 'complete' || state === 'error') && (
                  <button
                    onClick={handleReset}
                    className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium transition"
                  >
                    New Transfer
                  </button>
                )}
              </div>
            )}

            {/* Connecting state (no file meta yet) */}
            {!currentFile && state === 'connecting' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-green-400 mx-auto mb-2 animate-spin" />
                <p className="text-xs text-green-400">Connecting to peer...</p>
                <p className="text-[9px] text-gray-500 mt-1">Establishing WebRTC DataChannel</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-2 border-t border-green-500/10 text-center">
          <span className="text-[7px] text-gray-700 font-mono">OPERATOR v1.0 — decentralized file transfer — no FileZilla subscription needed</span>
        </div>
      </div>
    </div>
  )
}
