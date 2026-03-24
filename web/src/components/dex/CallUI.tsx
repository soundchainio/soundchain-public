/**
 * CallUI — Voice/Video call interface for SoundChain Pulse.
 *
 * Modes:
 * 1. Incoming call — ringing with accept/decline
 * 2. Outgoing call — calling with cancel
 * 3. Active call — connected with controls (mute, camera, hangup)
 * 4. Town Hall — multi-user voice room with avatar pills
 */

import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Users, Radio } from 'lucide-react'
import { useEffect, useRef, useCallback } from 'react'
import type { CallState, CallMode } from 'hooks/useWebRTCCall'

// Ringtone — plays during 'ringing' (incoming) and 'calling' (outgoing) states
function useRingtone(callState: CallState) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const shouldRing = callState === 'ringing' || callState === 'calling'

    if (shouldRing) {
      // Create audio element with a pleasant ring tone (Web Audio API generated)
      if (!audioRef.current) {
        const audio = new Audio()
        // Use a data URI for a simple ring tone (two-tone pattern)
        // This generates a basic ring using AudioContext if available
        try {
          const ctx = new AudioContext()
          const duration = 1.5
          const sampleRate = ctx.sampleRate
          const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate)
          const data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            // Two-tone ring: 440Hz + 480Hz with envelope
            const ring1 = Math.sin(2 * Math.PI * 440 * t)
            const ring2 = Math.sin(2 * Math.PI * 480 * t)
            // Ring pattern: 1s on, 0.5s off
            const onOff = t % 2 < 1 ? 1 : 0
            // Soft envelope
            const env = onOff * Math.min(1, (t % 2) * 10) * Math.min(1, (1 - (t % 2)) * 10)
            data[i] = (ring1 + ring2) * 0.15 * env
          }
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.loop = true
          source.connect(ctx.destination)
          source.start()
          audioRef.current = { stop: () => { source.stop(); ctx.close() } } as any
        } catch {
          // Fallback: no ringtone (AudioContext not available)
        }
      }

      // Vibration pattern for incoming calls (mobile)
      if (callState === 'ringing' && navigator.vibrate) {
        const vibrateLoop = setInterval(() => {
          navigator.vibrate([300, 200, 300, 200, 300])
        }, 2000)
        return () => {
          clearInterval(vibrateLoop)
          navigator.vibrate(0) // Stop vibration
        }
      }
    } else {
      // Stop ringtone
      if (audioRef.current) {
        try { (audioRef.current as any).stop?.() } catch {}
        audioRef.current = null
      }
      navigator.vibrate?.(0)
    }

    return () => {
      if (audioRef.current) {
        try { (audioRef.current as any).stop?.() } catch {}
        audioRef.current = null
      }
      navigator.vibrate?.(0)
    }
  }, [callState])
}

interface CallPeer {
  id: string
  displayName: string
  profilePicture?: string
  stream?: MediaStream
  speaking?: boolean
}

interface CallUIProps {
  callState: CallState
  callMode: CallMode
  remotePeer: CallPeer | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  formattedDuration: string
  // Town hall
  isTownHall: boolean
  townHallName: string
  townHallPeers: CallPeer[]
  // Actions
  onEndCall: () => void
  onToggleMute: () => void
  onToggleCamera: () => void
  onAnswerCall: () => void
  onDeclineCall: () => void
  onLeaveTownHall: () => void
}

// Video element that auto-plays a MediaStream
function StreamVideo({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])
  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />
}

// Town Hall participant pill — similar to Users page pills
function TownHallPill({ peer, isMe }: { peer: CallPeer; isMe: boolean }) {
  const initial = (peer.displayName || '?').charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-1.5 transition-all duration-300">
      <div className={`relative w-16 h-16 rounded-full overflow-hidden ring-2 transition-all duration-300 ${
        peer.speaking
          ? 'ring-green-400 shadow-lg shadow-green-500/30 scale-110'
          : 'ring-purple-500/40'
      }`}>
        {peer.profilePicture ? (
          <img src={peer.profilePicture} alt={peer.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xl font-bold">
            {initial}
          </div>
        )}
        {/* Speaking indicator pulse */}
        {peer.speaking && (
          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
        )}
        {/* Online dot */}
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
      </div>
      <span className="text-[10px] text-gray-300 font-medium truncate max-w-[70px]">
        {isMe ? 'You' : peer.displayName}
      </span>
    </div>
  )
}

export function CallUI({
  callState,
  callMode,
  remotePeer,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  formattedDuration,
  isTownHall,
  townHallName,
  townHallPeers,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onAnswerCall,
  onDeclineCall,
  onLeaveTownHall,
}: CallUIProps) {
  // Play ringtone + vibrate on incoming/outgoing call
  useRingtone(callState)

  if (callState === 'idle') return null

  // Town Hall Mode
  if (isTownHall && callState === 'connected') {
    return (
      <div className="fixed inset-0 z-[300] bg-gradient-to-b from-[#0b141a] via-[#111827] to-[#0b141a] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
            <div>
              <h2 className="text-white font-bold text-sm">{townHallName || 'Town Hall'}</h2>
              <span className="text-[10px] text-gray-400">{townHallPeers.length} listening · {formattedDuration}</span>
            </div>
          </div>
          <button
            onClick={onLeaveTownHall}
            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold hover:bg-red-500/30 transition-colors"
          >
            Leave
          </button>
        </div>

        {/* Participants — Avatar pills grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-6 justify-center items-start">
            {townHallPeers.map((peer) => (
              <TownHallPill key={peer.id} peer={peer} isMe={peer.stream === localStream} />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 py-6 border-t border-white/10">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button
            onClick={onLeaveTownHall}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    )
  }

  // 1:1 Call — Ringing (incoming)
  if (callState === 'ringing') {
    return (
      <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
        {/* Pulsing ring animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-500/20 animate-ping" />
          <div className="absolute inset-2 w-28 h-28 rounded-full bg-green-500/10 animate-ping animation-delay-200" />
          <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-green-500/50">
            {remotePeer?.profilePicture ? (
              <img src={remotePeer.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-4xl font-bold">
                {(remotePeer?.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-white text-xl font-bold mb-1">{remotePeer?.displayName || 'Unknown'}</h2>
        <p className="text-gray-400 text-sm mb-12">
          Incoming {callMode === 'video' ? 'video' : 'voice'} call...
        </p>

        <div className="flex items-center gap-12">
          <button
            onClick={onDeclineCall}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <button
            onClick={onAnswerCall}
            className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-600/30 hover:bg-green-700 transition-colors animate-bounce"
          >
            <Phone className="w-7 h-7" />
          </button>
        </div>
      </div>
    )
  }

  // 1:1 Call — Calling (outgoing)
  if (callState === 'calling') {
    return (
      <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-cyan-500/20 animate-ping" />
          <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-cyan-500/50">
            {remotePeer?.profilePicture ? (
              <img src={remotePeer.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-4xl font-bold">
                {(remotePeer?.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-white text-xl font-bold mb-1">{remotePeer?.displayName || 'Calling...'}</h2>
        <p className="text-gray-400 text-sm">
          {callMode === 'video' ? 'Video' : 'Voice'} calling...
        </p>
        <p className="text-cyan-400/60 text-xs font-mono mb-12">{formattedDuration}</p>

        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    )
  }

  // 1:1 Call — Connecting
  if (callState === 'connecting') {
    return (
      <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mb-6" />
        <p className="text-gray-400 text-sm">Connecting...</p>
      </div>
    )
  }

  // 1:1 Call — Connected
  if (callState === 'connected') {
    return (
      <div className="fixed inset-0 z-[300] bg-[#0b141a] flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative bg-black">
          {callMode === 'video' && remoteStream ? (
            <>
              <StreamVideo stream={remoteStream} className="w-full h-full object-cover" />
              {/* Local video pip */}
              <div className="absolute top-4 right-4 w-32 h-44 rounded-xl overflow-hidden ring-2 ring-white/20 shadow-xl">
                <StreamVideo stream={localStream} muted className="w-full h-full object-cover" />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Voice call — show avatar + waveform */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-cyan-500/30 mb-6">
                {remotePeer?.profilePicture ? (
                  <img src={remotePeer.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-3xl font-bold">
                    {(remotePeer?.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-white text-xl font-bold mb-1">{remotePeer?.displayName}</h2>
              <p className="text-cyan-400 text-sm font-mono">{formattedDuration}</p>
              {/* Voice waveform bars */}
              <div className="flex items-end gap-1 mt-6 h-8">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-cyan-500/60 rounded-full animate-pulse"
                    style={{
                      height: `${8 + Math.random() * 24}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hidden audio element for voice-only calls */}
          {callMode === 'voice' && remoteStream && (
            <audio
              autoPlay
              ref={(el) => { if (el && remoteStream) el.srcObject = remoteStream }}
            />
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-center gap-6 py-6 bg-[#0b141a] border-t border-white/10">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          {callMode === 'video' && (
            <button
              onClick={onToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isCameraOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    )
  }

  // Call ended
  if (callState === 'ended') {
    return (
      <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
        <X className="w-12 h-12 text-gray-500 mb-4" />
        <p className="text-gray-400 text-sm">Call ended</p>
      </div>
    )
  }

  return null
}

// Compact call button for chat header
export function CallButton({ onVoiceCall, onVideoCall, onTownHall }: {
  onVoiceCall: () => void
  onVideoCall: () => void
  onTownHall?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onVoiceCall}
        className="p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
        title="Voice call"
      >
        <Phone className="w-4 h-4" />
      </button>
      <button
        onClick={onVideoCall}
        className="p-2 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        title="Video call"
      >
        <Video className="w-4 h-4" />
      </button>
      {onTownHall && (
        <button
          onClick={onTownHall}
          className="p-2 rounded-full text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          title="Town Hall"
        >
          <Users className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
