/**
 * useOperatorTransfer — WebRTC DataChannel file transfer
 *
 * Reuses SoundChain's existing WebRTC infra (ICE/TURN/signaling)
 * but swaps MediaStream for DataChannel — files instead of audio.
 *
 * The FileZilla killer: direct device-to-device, encrypted, no server
 * in the data path, no subscription, no app download.
 *
 * Signaling: Pulse gateway (tunnel.soundchain.io WebSocket)
 * NAT traversal: Google STUN + SoundChain TURN (EC2)
 * Transfer: RTCDataChannel (ordered, reliable) — DTLS encrypted
 */

import { useCallback, useRef, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────

export type TransferState = 'idle' | 'waiting' | 'connecting' | 'transferring' | 'complete' | 'error'
export type TransferDirection = 'send' | 'receive'

export interface TransferFile {
  name: string
  size: number
  type: string
  progress: number // 0-100
  state: TransferState
  speed?: number // bytes/sec
}

export interface PeerDevice {
  id: string
  name: string
  connected: boolean
}

interface OperatorSignal {
  type: 'operator.offer' | 'operator.answer' | 'operator.ice' | 'operator.file-meta'
  fromId: string
  fromName: string
  toId: string
  data: any
}

// ─── Constants ──────────────────────────────────────────────────

const CHUNK_SIZE = 16384 // 16KB — WebRTC DataChannel max reliable chunk
const CHANNEL_LABEL = 'operator-file-transfer'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:44.209.136.62:3478',
      'turn:44.209.136.62:3478?transport=tcp',
    ],
    username: process.env.NEXT_PUBLIC_TURN_USER || 'soundchain',
    credential: process.env.NEXT_PUBLIC_TURN_CRED || 'b39406934b87e1f4967645b6e6da4319b2ebec452fddb0ef',
  },
]

// ─── Hook ───────────────────────────────────────────────────────

interface UseOperatorTransferOptions {
  myId: string
  myName: string
  gateway: { emit: (event: string, payload: any) => void; on: (event: string, handler: (payload: any) => void) => () => void; connected: boolean } | null
  onFileReceived?: (file: File) => void
}

export function useOperatorTransfer({ myId, myName, gateway, onFileReceived }: UseOperatorTransferOptions) {
  const [state, setState] = useState<TransferState>('idle')
  const [direction, setDirection] = useState<TransferDirection | null>(null)
  const [currentFile, setCurrentFile] = useState<TransferFile | null>(null)
  const [connectedPeer, setConnectedPeer] = useState<PeerDevice | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const receivedChunksRef = useRef<ArrayBuffer[]>([])
  const receivedMetaRef = useRef<{ name: string; size: number; type: string } | null>(null)
  const receivedBytesRef = useRef(0)
  const unsubRef = useRef<(() => void) | null>(null)
  const startTimeRef = useRef(0)

  // ─── Cleanup ────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      try { dcRef.current.close() } catch {}
      dcRef.current = null
    }
    if (pcRef.current) {
      try { pcRef.current.close() } catch {}
      pcRef.current = null
    }
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    receivedChunksRef.current = []
    receivedMetaRef.current = null
    receivedBytesRef.current = 0
    setState('idle')
    setDirection(null)
    setCurrentFile(null)
    setConnectedPeer(null)
  }, [])

  // ─── Create peer connection ─────────────────────────────────

  const createPC = useCallback((peerId: string, peerName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (e) => {
      if (e.candidate && gateway?.connected) {
        gateway.emit('operator.signal', {
          type: 'operator.ice',
          fromId: myId,
          fromName: myName,
          toId: peerId,
          data: e.candidate.toJSON(),
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnectedPeer({ id: peerId, name: peerName, connected: true })
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setState('error')
      }
    }

    pcRef.current = pc
    return pc
  }, [myId, myName, gateway])

  // ─── Setup data channel listeners ───────────────────────────

  const setupDCListeners = useCallback((dc: RTCDataChannel) => {
    dc.binaryType = 'arraybuffer'

    dc.onopen = () => {
      console.log('[Operator] DataChannel open')
      setState('transferring')
    }

    dc.onmessage = (evt) => {
      if (typeof evt.data === 'string') {
        // JSON control message
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === 'file-meta') {
            receivedMetaRef.current = { name: msg.name, size: msg.size, type: msg.mimeType }
            receivedChunksRef.current = []
            receivedBytesRef.current = 0
            startTimeRef.current = Date.now()
            setCurrentFile({
              name: msg.name,
              size: msg.size,
              type: msg.mimeType,
              progress: 0,
              state: 'transferring',
            })
            setDirection('receive')
            setState('transferring')
          } else if (msg.type === 'file-complete') {
            // Reassemble file
            const blob = new Blob(receivedChunksRef.current, { type: receivedMetaRef.current?.type || 'application/octet-stream' })
            const file = new File([blob], receivedMetaRef.current?.name || 'download', { type: blob.type })

            setCurrentFile(prev => prev ? { ...prev, progress: 100, state: 'complete' } : null)
            setState('complete')

            // Trigger download
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = file.name
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            onFileReceived?.(file)
          }
        } catch {}
      } else {
        // Binary chunk
        receivedChunksRef.current.push(evt.data as ArrayBuffer)
        receivedBytesRef.current += (evt.data as ArrayBuffer).byteLength

        const total = receivedMetaRef.current?.size || 1
        const progress = Math.round((receivedBytesRef.current / total) * 100)
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const speed = elapsed > 0 ? Math.round(receivedBytesRef.current / elapsed) : 0

        setCurrentFile(prev => prev ? {
          ...prev,
          progress,
          speed,
          state: 'transferring',
        } : null)
      }
    }

    dc.onclose = () => {
      console.log('[Operator] DataChannel closed')
    }

    dc.onerror = (err) => {
      console.error('[Operator] DataChannel error:', err)
      setState('error')
    }

    dcRef.current = dc
  }, [onFileReceived])

  // ─── SEND: Initiate transfer to a peer ──────────────────────

  const sendFile = useCallback(async (file: File, peerId: string, peerName: string) => {
    if (!gateway?.connected) {
      setState('error')
      return
    }

    setState('connecting')
    setDirection('send')
    setCurrentFile({
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      state: 'connecting',
    })

    const pc = createPC(peerId, peerName)

    // Create data channel (sender creates it)
    const dc = pc.createDataChannel(CHANNEL_LABEL, { ordered: true })
    setupDCListeners(dc)

    dc.onopen = async () => {
      console.log('[Operator] Sending file:', file.name, file.size, 'bytes')
      setState('transferring')

      // Send file metadata first
      dc.send(JSON.stringify({
        type: 'file-meta',
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }))

      // Read file and send in chunks
      const arrayBuffer = await file.arrayBuffer()
      let offset = 0
      const total = arrayBuffer.byteLength
      startTimeRef.current = Date.now()

      const sendChunk = () => {
        while (offset < total) {
          // Backpressure: if buffered amount is high, wait
          if (dc.bufferedAmount > CHUNK_SIZE * 8) {
            setTimeout(sendChunk, 10)
            return
          }

          const end = Math.min(offset + CHUNK_SIZE, total)
          const chunk = arrayBuffer.slice(offset, end)
          dc.send(chunk)
          offset = end

          const progress = Math.round((offset / total) * 100)
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          const speed = elapsed > 0 ? Math.round(offset / elapsed) : 0

          setCurrentFile(prev => prev ? { ...prev, progress, speed, state: 'transferring' } : null)
        }

        // All chunks sent
        dc.send(JSON.stringify({ type: 'file-complete' }))
        setCurrentFile(prev => prev ? { ...prev, progress: 100, state: 'complete' } : null)
        setState('complete')
      }

      sendChunk()
    }

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    gateway.emit('operator.signal', {
      type: 'operator.offer',
      fromId: myId,
      fromName: myName,
      toId: peerId,
      data: { sdp: offer.sdp, type: offer.type },
    })
  }, [gateway, myId, myName, createPC, setupDCListeners])

  // ─── LISTEN: Handle incoming transfers ──────────────────────

  const startListening = useCallback(() => {
    if (!gateway) return

    // Clean up previous listener
    if (unsubRef.current) unsubRef.current()

    const unsub = gateway.on('operator.signal', async (payload: OperatorSignal) => {
      if (payload.toId !== myId) return

      if (payload.type === 'operator.offer') {
        // Incoming transfer request
        setState('connecting')
        setDirection('receive')
        setConnectedPeer({ id: payload.fromId, name: payload.fromName, connected: false })

        const pc = createPC(payload.fromId, payload.fromName)

        // Listen for data channel (receiver gets it via event)
        pc.ondatachannel = (evt) => {
          setupDCListeners(evt.channel)
        }

        await pc.setRemoteDescription(new RTCSessionDescription(payload.data))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        gateway.emit('operator.signal', {
          type: 'operator.answer',
          fromId: myId,
          fromName: myName,
          toId: payload.fromId,
          data: { sdp: answer.sdp, type: answer.type },
        })
      } else if (payload.type === 'operator.answer') {
        // Answer to our offer
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.data))
        }
      } else if (payload.type === 'operator.ice') {
        // ICE candidate
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.data))
          } catch (err) {
            console.warn('[Operator] Failed to add ICE candidate:', err)
          }
        }
      }
    })

    unsubRef.current = unsub
  }, [gateway, myId, myName, createPC, setupDCListeners])

  return {
    state,
    direction,
    currentFile,
    connectedPeer,
    sendFile,
    startListening,
    cleanup,
  }
}
