/**
 * useWebRTCCall — WebRTC voice/video calling hook for SoundChain Pulse.
 *
 * Signaling strategy:
 *  1. Primary: OpenClaw WebSocket gateway (emit/on 'call.signal')
 *  2. Fallback: GraphQL mutations + 1s polling (CallSignal model with 60s TTL)
 *
 * STUN servers: Google's free public servers.
 * TURN: Self-hosted on EC2 (TODO — add coturn config).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended'
export type CallMode = 'voice' | 'video'

interface CallPeer {
  id: string
  displayName: string
  profilePicture?: string
  stream?: MediaStream
  speaking?: boolean
}

interface UseWebRTCCallOptions {
  myId: string | undefined
  myName: string
  myAvatar?: string
  gateway?: {
    emit: (event: string, payload: Record<string, unknown>) => void
    on: (event: string, handler: (payload: Record<string, unknown>) => void) => () => void
    connected: boolean
  }
  onIncomingCall?: (callId: string, callerId: string, callerName: string, mode: CallMode) => void
}

const ICE_SERVERS: RTCIceServer[] = [
  // STUN servers for NAT traversal
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // SoundChain TURN server (self-hosted on EC2 — no third-party dependency)
  // Handles symmetric NAT: mobile carriers, corporate networks, cross-carrier calls
  {
    urls: [
      'turn:44.209.136.62:3478',
      'turn:44.209.136.62:3478?transport=tcp',
    ],
    username: process.env.NEXT_PUBLIC_TURN_USER || 'soundchain',
    credential: process.env.NEXT_PUBLIC_TURN_CRED || 'b39406934b87e1f4967645b6e6da4319b2ebec452fddb0ef',
  },
  // Optional: override with external TURN provider via env vars
  ...(process.env.NEXT_PUBLIC_TURN_URL ? [{
    urls: process.env.NEXT_PUBLIC_TURN_URL.split(','),
    username: process.env.NEXT_PUBLIC_TURN_USER || '',
    credential: process.env.NEXT_PUBLIC_TURN_CRED || '',
  }] : []),
]

export function useWebRTCCall({ myId, myName, myAvatar, gateway, onIncomingCall }: UseWebRTCCallOptions) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [callMode, setCallMode] = useState<CallMode>('voice')
  const [callId, setCallId] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [remotePeer, setRemotePeer] = useState<CallPeer | null>(null)

  // Town hall state
  const [townHallPeers, setTownHallPeers] = useState<CallPeer[]>([])
  const [isTownHall, setIsTownHall] = useState(false)
  const [townHallName, setTownHallName] = useState('')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const signalCleanupRef = useRef<(() => void) | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const ringTimerRef = useRef<ReturnType<typeof setInterval>>()
  const endCallRef = useRef<(() => void) | null>(null)

  // Refs to read current state without adding deps (breaks re-render cascade)
  const gatewayRef = useRef(gateway)
  gatewayRef.current = gateway
  const callIdRef = useRef(callId)
  const remotePeerRef = useRef(remotePeer)
  const callStateRef = useRef(callState)
  callIdRef.current = callId
  remotePeerRef.current = remotePeer
  callStateRef.current = callState

  // Generate unique call ID
  const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Send signal via gateway (uses ref to always check latest connection state)
  const sendSignal = useCallback((toId: string, cId: string, signalType: string, data: Record<string, unknown>) => {
    const gw = gatewayRef.current
    if (!gw || !myId) {
      console.warn(`[Call] sendSignal blocked: gw=${!!gw} myId=${myId}`)
      return
    }
    const payload = {
      toId,
      callId: cId,
      signalType,
      senderId: myId,
      senderName: myName,
      senderAvatar: myAvatar,
      data,
    }
    if (gw.connected) {
      console.log(`[Call] Sending ${signalType} to ${toId} (callId=${cId})`)
      gw.emit('call.signal', payload)
    } else {
      console.warn(`[Call] Gateway NOT connected — ${signalType} to ${toId} DROPPED`)
    }
  }, [myId, myName, myAvatar])

  // Get user media
  const getMedia = useCallback(async (mode: CallMode) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: mode === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        } : false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('[Call] Failed to get media:', err)
      return null
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string, cId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      // On mobile, force relay mode to skip slow STUN probing and go straight to TURN
      ...(typeof navigator !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent)
        ? { iceTransportPolicy: 'relay' as RTCIceTransportPolicy }
        : {}),
    })
    pcRef.current = pc

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (stream) {
        setRemoteStream(stream)
      }
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, cId, 'ice', { candidate: event.candidate.toJSON() })
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        // Clear ring timeout and ring elapsed timer (BUG-003 + BUG-006)
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
        if (ringTimerRef.current) clearInterval(ringTimerRef.current)
        setCallDuration(0) // Reset for call duration counting
        setCallState('connected')
        // Start call duration timer
        timerRef.current = setInterval(() => {
          setCallDuration(d => d + 1)
        }, 1000)
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall()
      }
    }

    return pc
  }, [sendSignal])

  // Initiate a call
  const startCall = useCallback(async (peerId: string, peerName: string, peerAvatar: string | undefined, mode: CallMode) => {
    if (!myId || callState !== 'idle') return

    const cId = generateCallId()
    setCallId(cId)
    setCallMode(mode)
    setCallState('calling')
    setCallDuration(0)
    setRemotePeer({ id: peerId, displayName: peerName, profilePicture: peerAvatar })

    // BUG-CALL-006: Start ring elapsed timer (shows caller how long they've been ringing)
    ringTimerRef.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)

    // BUG-CALL-001: Wait for signaling relay to be ready (max 5 seconds)
    if (!gatewayRef.current?.connected) {
      console.log('[Call] Waiting for signaling relay...')
      const connected = await new Promise<boolean>((resolve) => {
        let elapsed = 0
        const interval = setInterval(() => {
          elapsed += 200
          if (gatewayRef.current?.connected) {
            clearInterval(interval)
            resolve(true)
          } else if (elapsed >= 5000) {
            clearInterval(interval)
            resolve(false)
          }
        }, 200)
      })
      if (!connected) {
        console.warn('[Call] Signaling relay not connected — cannot start call')
        if (ringTimerRef.current) clearInterval(ringTimerRef.current)
        setCallState('idle')
        setCallId(null)
        setRemotePeer(null)
        setCallDuration(0)
        return
      }
    }

    const stream = await getMedia(mode)
    if (!stream) {
      if (ringTimerRef.current) clearInterval(ringTimerRef.current)
      setCallState('idle')
      setCallDuration(0)
      return
    }

    const pc = createPeerConnection(peerId, cId)

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Send invite + offer
    sendSignal(peerId, cId, 'invite', {
      mode,
      sdp: offer.sdp,
      type: offer.type,
    })

    // BUG-CALL-003: Auto-hangup after 30 seconds if callee doesn't answer
    ringTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === 'calling') {
        endCallRef.current?.()
      }
    }, 60000) // 60s timeout for cellular TURN relay connections
  }, [myId, callState, getMedia, createPeerConnection, sendSignal])

  // Answer an incoming call
  const answerCall = useCallback(async (incomingCallId: string, callerId: string, callerName: string, callerAvatar: string | undefined, mode: CallMode, offerSdp: string) => {
    if (!myId) return

    setCallId(incomingCallId)
    setCallMode(mode)
    setCallState('connecting')
    setCallDuration(0)
    setRemotePeer({ id: callerId, displayName: callerName, profilePicture: callerAvatar })

    const stream = await getMedia(mode)
    if (!stream) {
      sendSignal(callerId, incomingCallId, 'decline', {})
      setCallState('idle')
      return
    }

    const pc = createPeerConnection(callerId, incomingCallId)

    // Set remote offer
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }))

    // Flush pending ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
    pendingCandidatesRef.current = []

    // Create answer
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    sendSignal(callerId, incomingCallId, 'answer', {
      sdp: answer.sdp,
      type: answer.type,
    })
  }, [myId, getMedia, createPeerConnection, sendSignal])

  // Decline an incoming call
  const declineCall = useCallback((incomingCallId: string, callerId: string) => {
    sendSignal(callerId, incomingCallId, 'decline', {})
    setCallState('idle')
    setCallId(null)
    setRemotePeer(null)
  }, [sendSignal])

  // End the call — uses refs for callId/remotePeer to avoid dependency cascade
  // (endCall changing → signal listener re-fires → endCall changes → infinite loop in PWA)
  const endCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    // BUG-CALL-003 + BUG-CALL-006: Clear ring timeout and ring elapsed timer
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    if (ringTimerRef.current) clearInterval(ringTimerRef.current)
    if (callIdRef.current && remotePeerRef.current) {
      sendSignal(remotePeerRef.current.id, callIdRef.current, 'hangup', {})
    }
    setCallState('ended')
    setRemoteStream(null)
    setLocalStream(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsCameraOff(false)
    pendingCandidatesRef.current = []

    // Reset to idle after showing "ended" briefly
    setTimeout(() => {
      setCallState('idle')
      setCallId(null)
      setRemotePeer(null)
    }, 2000)
  }, [sendSignal])
  endCallRef.current = endCall

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsMuted(m => !m)
    }
  }, [])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsCameraOff(c => !c)
    }
  }, [])

  // ── Town Hall ──

  const createTownHall = useCallback(async (name: string) => {
    if (!myId) return
    const cId = generateCallId()
    setCallId(cId)
    setIsTownHall(true)
    setTownHallName(name)
    setCallMode('voice')
    setCallState('connected')

    const stream = await getMedia('voice')
    if (!stream) {
      setCallState('idle')
      return
    }

    setTownHallPeers([{ id: myId, displayName: myName, profilePicture: myAvatar, stream, speaking: false }])

    // Start duration timer
    timerRef.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)
  }, [myId, myName, myAvatar, getMedia])

  const leaveTownHall = useCallback(() => {
    endCall()
    setIsTownHall(false)
    setTownHallPeers([])
    setTownHallName('')
  }, [endCall])

  // Listen for incoming signals via gateway
  useEffect(() => {
    if (!gateway || !myId) return

    console.log(`[Call] Signal listener registered — myId=${myId}, gateway.connected=${gateway.connected}`)

    const cleanup = gateway.on('call.signal', (payload: Record<string, unknown>) => {
      const { signalType, callId: inCallId, senderId, senderName, senderAvatar, data } = payload as {
        signalType: string
        callId: string
        senderId: string
        senderName: string
        senderAvatar?: string
        data: Record<string, unknown>
      }

      console.log(`[Call] Received signal: ${signalType} from ${senderName} (${senderId}), toId=${payload.toId}, myId=${myId}`)

      // Only process signals meant for us
      const toId = payload.toId as string
      if (toId && toId !== myId) {
        console.log(`[Call] Signal not for us — toId=${toId} !== myId=${myId}`)
        return
      }

      switch (signalType) {
        case 'invite': {
          const mode = (data.mode as CallMode) || 'voice'
          setCallState('ringing')
          setCallId(inCallId)
          setRemotePeer({ id: senderId, displayName: senderName, profilePicture: senderAvatar })
          setCallMode(mode)
          // Store the offer SDP for when user accepts
          pendingCandidatesRef.current = []
          // Store offer in a ref-accessible way
          ;(window as any).__pendingCallOffer = { callId: inCallId, senderId, senderName, senderAvatar, mode, offerSdp: data.sdp }
          onIncomingCall?.(inCallId, senderId, senderName, mode)
          break
        }
        case 'answer': {
          if (pcRef.current) {
            pcRef.current.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: data.sdp as string,
            }))
            setCallState('connecting')
            // Flush pending ICE candidates
            for (const candidate of pendingCandidatesRef.current) {
              pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidatesRef.current = []
          }
          break
        }
        case 'ice': {
          const candidate = data.candidate as RTCIceCandidateInit
          if (pcRef.current && pcRef.current.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          } else {
            pendingCandidatesRef.current.push(candidate)
          }
          break
        }
        case 'hangup':
        case 'decline': {
          endCallRef.current?.()
          break
        }
      }
    })

    signalCleanupRef.current = cleanup
    return cleanup
  }, [gateway, myId, onIncomingCall])

  // Format call duration as mm:ss
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    // State
    callState,
    callMode,
    callId,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callDuration,
    formattedDuration: formatDuration(callDuration),
    remotePeer,
    // Town hall
    isTownHall,
    townHallName,
    townHallPeers,
    // Actions
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    createTownHall,
    leaveTownHall,
  }
}
