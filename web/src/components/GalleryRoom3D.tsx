/**
 * GalleryRoom3D — Personal NFT/SCid gallery scene (Nodeverse)
 *
 * Three.js 3D room with frames on walls. Each frame shows:
 * - NFT artwork
 * - SCid track cover (with audio playback when nearby)
 * - Wall/feed post media
 *
 * WASD to walk through. Click any frame for detail modal.
 * Frames within 4 units = audio fades in (proximity audio).
 *
 * Themes: 'modern' | 'cyberpunk' | 'vinyl' | 'vault'
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinnedMesh } from 'three/examples/jsm/utils/SkeletonUtils.js'
// Phase 16.66 — PBR + HDR + bloom imports. RoomEnvironment is procedural
// (no asset download required), generates a scene with arranged light
// sources that PMREMGenerator samples into an env cubemap for IBL.
// EffectComposer + UnrealBloomPass adds the AAA-style bloom on emissive
// surfaces (rim, lights, score banners) and tone-mapped highlights.
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { useRouter } from 'next/router'
import { Music, X, Heart, Share2, Play, Pause, Volume2, Copy, Check, Paintbrush, Plus, UserCog, Sparkles } from 'lucide-react'
import { toast } from 'react-toastify'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, filterByCategory, getPlacedFurniture, savePlacedFurniture, getFurnitureById, type PlacedFurniture, type FurnitureCategory } from 'lib/nodeverse/galleryFurniture'
import { AudioPlayer } from 'components/AudioPlayer'
import { CharacterDesigner, getStoredCharacter, type CharacterConfig } from 'components/CharacterDesigner'
import { connectAsHost, connectAsGuest, type GymPeer, type GymStateMsg, type GymEventMsg } from 'lib/gym/multiplayer'
import { detectPlatform, onGamepadChange, type PlatformInfo } from 'lib/platformDetect'

interface Track {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  playbackUrl?: string
  audioUrl?: string
  isNFT?: boolean
  editionSize?: number
  ipfsHash?: string
}

interface GalleryRoom3DProps {
  ownerHandle: string
  ownerProfileId?: string
  theme?: 'modern' | 'cyberpunk' | 'vinyl' | 'vault' | 'city' | 'gym' | 'blacktop'
}

const THEME_CONFIG = {
  modern: { wall: 0xf5f5f5, floor: 0xe5e5e5, accent: 0x22d3ee, ambient: 0xffffff, name: 'MODERN' },
  cyberpunk: { wall: 0x1a1a3a, floor: 0x0a0a1a, accent: 0xa855f7, ambient: 0x4040ff, name: 'CYBERPUNK' },
  vinyl: { wall: 0x3a2a1a, floor: 0x2a1a0a, accent: 0xfacc15, ambient: 0xfacc15, name: 'VINYL STORE' },
  vault: { wall: 0x0a0a0a, floor: 0x050505, accent: 0xfacc15, ambient: 0x666666, name: 'NFT VAULT' },
  // Phase 16.12 — GTA / NBA2K-style city street. Brick storefronts on side
  // walls, alley gaps, billboards on building facades displaying user's NFTs.
  // Walk through the "block" like a player-one mode game.
  city: { wall: 0x3a2520, floor: 0x222428, accent: 0xfacc15, ambient: 0x5a4a3a, name: 'CITY STREETS' },
  // Phase 16.39 — SoundChain Shootaround. Two basketball-focused themes:
  // GYM = indoor open gym with wood floor, NBA-style markings, two hoops,
  //       bleachers, gym lights. Full-court basketball.
  // BLACKTOP = outdoor street court, asphalt + chain-link fence + graffiti,
  //            single hoop, urban vibe.
  gym:      { wall: 0xede2c8, floor: 0xc8a060, accent: 0xdc2626, ambient: 0xfff0e0, name: 'OPEN GYM' },
  blacktop: { wall: 0x1a1a1a, floor: 0x2a2a2a, accent: 0xfacc15, ambient: 0x6a5a4a, name: 'BLACKTOP' },
}

export default function GalleryRoom3D({ ownerHandle, ownerProfileId, theme = 'cyberpunk' }: GalleryRoom3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [stats, setStats] = useState({ fps: 0, frames: 0, position: 'x:0 z:0' })
  const [nowPlaying, setNowPlaying] = useState<string | null>(null)
  const audioRefsMap = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Furniture state — declared before the scene-building useEffect that reads placedFurniture
  const [showCustomize, setShowCustomize] = useState(false)
  // Phase 16.66 — Ready Player Me avatar modal. Drops in a rigged GLB
  // that's Mixamo-compatible so it inherits every body animation we wire
  // up later. RPM hub is hosted; we listen for the postMessage events
  // it fires when the user exports their avatar.
  const [showRpm, setShowRpm] = useState(false)
  // Phase 16.67 — Character Designer modal. Previously only mounted in
  // Explore3DScene, so gym/blacktop users had no entry point to AI BUILD
  // (Lucy SDXL + TripoSR on anvil RTX 5000). Now lives inside the gym
  // too, gated by the new DESIGN pill in the cluster.
  const [showDesigner, setShowDesigner] = useState(false)
  // Phase 16.66 — RPM postMessage bridge. The creator iframe emits
  // structured JSON messages on the window; we filter for the
  // `v1.avatar.exported` event, pull the GLB URL, merge it into the
  // stored character config, then dispatch 'character-updated' so the
  // active gym scene rebuilds the avatar with the new model. Same
  // path the CharacterDesigner already uses, so no scene-side wiring
  // changes needed.
  useEffect(() => {
    if (!showRpm) return
    const onMsg = (ev: MessageEvent) => {
      let payload: any = ev.data
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload) } catch { return }
      }
      if (!payload || payload.source !== 'readyplayerme') return
      if (payload.eventName !== 'v1.avatar.exported') return
      const url: string | undefined = payload?.data?.url
      if (!url) return
      try {
        const raw = localStorage.getItem('soundchain_character')
        const prev = raw ? JSON.parse(raw) : {}
        const next = { ...prev, humanGlbUrl: url, aiGlbUrl: url, type: 'human' }
        localStorage.setItem('soundchain_character', JSON.stringify(next))
        window.dispatchEvent(new CustomEvent('character-updated', { detail: next }))
        toast.success('Avatar loaded into the gym')
      } catch (e) {
        console.error('[GalleryRoom3D] RPM avatar save failed', e)
      }
      setShowRpm(false)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [showRpm])
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory | 'all'>('all')
  // Phase 16.13 — gamepad connection state (HUD indicator)
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const gamepadConnectedRef = useRef(false)
  // Phase 16.46 — edge-trigger state per button so holding doesn't auto-spam
  const gamepadButtonStateRef = useRef<Record<number, boolean>>({})
  // Phase 16.47 — WebRTC 1-on-1 multiplayer state
  const peerRef = useRef<GymPeer | null>(null)
  const remoteAvatarRef = useRef<{
    holder: THREE.Group
    state: { mixer?: THREE.AnimationMixer; clips?: Record<string, THREE.AnimationAction>; currentClip?: string }
    lastState?: GymStateMsg
    nameLabel?: THREE.Sprite
  } | null>(null)
  const [mpMode, setMpMode] = useState<'solo' | 'lobby' | 'host-waiting' | 'guest-joining' | 'connected'>('solo')
  const [mpRoomCode, setMpRoomCode] = useState('')
  const [mpJoinInput, setMpJoinInput] = useState('')
  const [mpRemoteHandle, setMpRemoteHandle] = useState('Player 2')
  const [mpError, setMpError] = useState('')
  // Phase 16.63 — platform + input mode detection (Xbox, PS, Switch, mobile,
  // TV, desktop). Surfaces a HUD badge + control hints adapted to the device.
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => detectPlatform())
  useEffect(() => {
    const refresh = () => setPlatformInfo(detectPlatform())
    refresh()
    return onGamepadChange(refresh)
  }, [])
  // Phase 16.63 — deep-link auto-join. URL `?room=ABC123` (set after host
  // copies share-link) auto-fires startMultiplayerGuest on mount. Lets a
  // friend tap one link to be dropped straight into the lobby — no code
  // typing required. Works across Xbox / PS / Switch / mobile / desktop.
  const autoJoinedRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (autoJoinedRef.current) return
    const params = new URLSearchParams(window.location.search)
    const room = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (room.length !== 6) return
    // Wait for scene + multiplayer hooks to be available before joining
    const tryJoin = () => {
      const fn = (sceneRef.current as any)?.userData?.startMultiplayerGuest
      if (fn) {
        autoJoinedRef.current = true
        setMpMode('guest-joining')
        fn(room)
        return true
      }
      return false
    }
    if (tryJoin()) return
    const id = setInterval(() => { if (tryJoin()) clearInterval(id) }, 250)
    const timeout = setTimeout(() => clearInterval(id), 8000)  // give up after 8s
    return () => { clearInterval(id); clearTimeout(timeout) }
  }, [theme])
  // Phase 16.26 — city location state (street search result)
  const [cityLocation, setCityLocation] = useState<{ label: string; lat: number; lng: number } | null>(null)
  const cityLocationRef = useRef<{ label: string; lat: number; lng: number } | null>(null)
  // Scene ref so the cityLocation useEffect can paint the in-world sign
  // without rebuilding the whole 3D scene.
  const sceneRef = useRef<THREE.Scene | null>(null)
  // Phase 16.27 — basketball mechanic state
  const [hoopScore, setHoopScore] = useState({ makes: 0, attempts: 0, streak: 0 })
  const shootRef = useRef<(() => void) | null>(null)
  // Phase 16.51 — score popups (floating "+2 / +3 / SLAM!" text) + camera shake
  type ScorePopup = { id: number; text: string; color: string; screenX: number; screenY: number; bornAt: number }
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([])
  const scorePopupIdRef = useRef(0)
  const cameraShakeRef = useRef<{ intensity: number; t: number; duration: number }>({ intensity: 0, t: 0, duration: 0 })
  // Phase 16.52 — hot zones: court tile grid tracking makes per cell
  const hotZoneRef = useRef<Map<string, { makes: number; lastMakeAt: number }>>(new Map())
  // Phase 16.53 — game clocks: shot clock (24s, resets on shot) + session timer
  const [shotClock, setShotClock] = useState(24)
  const [sessionTime, setSessionTime] = useState(0)  // seconds played
  const shotClockRef = useRef(24)
  const sessionTimeRef = useRef(0)
  const clocksRunningRef = useRef(false)
  // Phase 16.56 — real point scoring + win condition (first to 21)
  const [pointScore, setPointScore] = useState({ player: 0, defender: 0 })
  const [gameOver, setGameOver] = useState<null | 'player' | 'defender'>(null)
  const POINTS_TO_WIN = 21
  // Phase 16.58 — per-shot stats tracking for end-of-game breakdown
  type ShotStats = { makes: number; attempts: number }
  const [gameStats, setGameStats] = useState<{ [k: string]: ShotStats }>({
    jumpshot: { makes: 0, attempts: 0 },
    three: { makes: 0, attempts: 0 },
    dunk: { makes: 0, attempts: 0 },
    layup: { makes: 0, attempts: 0 },
    fadeaway: { makes: 0, attempts: 0 },
  })
  const [defenderBlocks, setDefenderBlocks] = useState(0)
  // Phase 16.58 — Big Play Cam banner (POSTERIZED!, ON FIRE!, etc.)
  type BigPlayBanner = { id: number; text: string; color: string; emoji: string; bornAt: number }
  const [bigPlay, setBigPlay] = useState<BigPlayBanner | null>(null)
  const bigPlayIdRef = useRef(0)
  // Phase 16.70 — 2K shot meter. Fills during the shot's jump arc.
  // Perfect window = 70-85% fill = green burst at release. Hidden when idle.
  const [shotMeter, setShotMeter] = useState<{ active: boolean; progress: number; quality: 'early' | 'good' | 'perfect' | 'late' } | null>(null)
  const shotMeterRef = useRef<{ startMs: number; durationMs: number } | null>(null)
  // Phase 16.75 — inbound state. After every make, brief 1.5s pause where
  // ball is "checked" + both players reset to standard starting positions.
  // CHECK BALL banner appears. Real-basketball rhythm — game breathes.
  const [inboundActive, setInboundActive] = useState(false)
  const inboundUntilRef = useRef(0)
  // Phase 16.73 — possession state mirrored to React so HUD can swap
  // SHOOT↔DEFENSE based on who owns the ball. Polled at 5Hz from the
  // scene userData (ballState.owner) since the scene mutates outside
  // React. Reads as 'player' (offense) | 'defender' (we play D).
  const [possession, setPossession] = useState<'player' | 'defender'>('player')
  useEffect(() => {
    if (theme !== 'gym' && theme !== 'blacktop') return
    const id = setInterval(() => {
      const owner = (sceneRef.current as any)?.userData?.ball?.ballState?.owner
      if (owner === 'defender') setPossession((p) => p === 'defender' ? p : 'defender')
      else setPossession((p) => p === 'player' ? p : 'player')
    }, 200)
    return () => clearInterval(id)
  }, [theme])
  // Phase 16.71 — ARENA MUSIC. SCid/NFT tracks from /api/agent/radio play
  // continuously in gym/blacktop, just like NBA arenas pump music during
  // gameplay + timeouts + halftime. Auto-advances on track end. Links the
  // basketball game directly into the SC music ecosystem.
  type ArenaTrack = { title: string; artist: string; scid: string; streamUrl: string; artworkUrl?: string }
  const [arenaTrack, setArenaTrack] = useState<ArenaTrack | null>(null)
  const arenaAudioRef = useRef<HTMLAudioElement | null>(null)
  // Phase 16.59 — difficulty selector affects defender AI
  type Difficulty = 'easy' | 'normal' | 'hard'
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const difficultyRef = useRef<Difficulty>('normal')
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])
  // Phase 16.59 — pause toggle (mid-game halt)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = paused }, [paused])
  // Phase 16.71 — duck arena music when paused / game over.
  // Must live AFTER paused / gameOver / arenaAudioRef declarations above
  // (was hoisted near top in 16.71 ship; deps array eagerly reads paused/
  // gameOver at render time → TDZ crash in minified prod bundle).
  useEffect(() => {
    const a = arenaAudioRef.current
    if (!a) return
    a.volume = paused || gameOver ? 0.08 : 0.32
  }, [paused, gameOver])
  // Phase 16.71 — fetch + auto-play SCid arena music. Only active on
  // gym/blacktop. Skips tracks on 'ended'; respects React 18 strict-mode
  // double-mount via the ref guard.
  useEffect(() => {
    const isGym = theme === 'gym' || theme === 'blacktop'
    if (!isGym) {
      if (arenaAudioRef.current) {
        try { arenaAudioRef.current.pause() } catch {}
        arenaAudioRef.current = null
      }
      setArenaTrack(null)
      return
    }
    let cancelled = false
    const loadNext = async () => {
      try {
        const r = await fetch('/api/agent/radio', { cache: 'no-store' })
        if (cancelled || !r.ok) return
        const data = await r.json()
        const np = data?.data?.now_playing
        if (!np?.stream_url) return
        const track: ArenaTrack = {
          title: np.title || 'Unknown',
          artist: np.artist || 'SoundChain',
          scid: np.scid || '',
          streamUrl: np.stream_url,
          artworkUrl: np.artwork_url,
        }
        if (cancelled) return
        setArenaTrack(track)
        const audio = new Audio(track.streamUrl)
        audio.crossOrigin = 'anonymous'
        audio.volume = 0.32  // arena ambient — under the announcer voice
        audio.loop = false
        audio.preload = 'auto'
        audio.onended = () => { if (!cancelled) loadNext() }
        audio.onerror = () => { if (!cancelled) setTimeout(loadNext, 2000) }
        if (arenaAudioRef.current) { try { arenaAudioRef.current.pause() } catch {} }
        arenaAudioRef.current = audio
        // Autoplay needs user gesture in many browsers; .play() returns a
        // Promise we catch + retry on first interaction.
        audio.play().catch(() => {
          const tryPlay = () => {
            audio.play().catch(() => {})
            window.removeEventListener('pointerdown', tryPlay)
            window.removeEventListener('keydown', tryPlay)
          }
          window.addEventListener('pointerdown', tryPlay, { once: true })
          window.addEventListener('keydown', tryPlay, { once: true })
        })
      } catch {}
    }
    loadNext()
    return () => {
      cancelled = true
      if (arenaAudioRef.current) {
        try { arenaAudioRef.current.pause() } catch {}
        arenaAudioRef.current = null
      }
    }
  }, [theme])
  // Phase 16.64 — NBA 2K-style camera presets. Cycle with Tab (keyboard) or
  // D-pad Up (gamepad button 12). Tab not 'C' so the binding doesn't collide
  // with crossover ('c' / RB). Each preset has its own distance / height /
  // look-at formula. 2K cam is the default and is the only one that responds
  // to mouse drag for yaw/pitch.
  type CameraPreset = '2K' | 'BROADCAST' | 'SIDE' | 'HIGH' | 'PLAYER LOCK' | 'SKYBOX'
  const CAMERA_PRESETS: CameraPreset[] = ['2K', 'BROADCAST', 'SIDE', 'HIGH', 'PLAYER LOCK', 'SKYBOX']
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('2K')
  const cameraPresetRef = useRef<CameraPreset>('2K')
  useEffect(() => { cameraPresetRef.current = cameraPreset }, [cameraPreset])
  // Phase 16.64 — MISS / MAKE callout banner (separate from score popups)
  const [shotResult, setShotResult] = useState<{ text: string; color: string; bornAt: number } | null>(null)
  useEffect(() => {
    if (!shotResult) return
    const id = window.setTimeout(() => setShotResult(null), 1200)
    return () => window.clearTimeout(id)
  }, [shotResult])
  // Phase 16.29 — city search now opens as a full modal dialog so typing
  // isn't gated by any z-index / pointer-event conflicts with the canvas.
  const [citySearchOpen, setCitySearchOpen] = useState(false)
  const [citySearchValue, setCitySearchValue] = useState('')
  const [citySearchLoading, setCitySearchLoading] = useState(false)
  const citySearchInputRef = useRef<HTMLInputElement>(null)
  // Phase 16.32 — aggressive focus + iOS-keyboard-summon when modal opens
  useEffect(() => {
    if (!citySearchOpen) return
    // Restore body touchAction in case anything else set it to 'none' (e.g.
    // an earlier CharacterDesigner modal cleanup race). iOS Safari refuses
    // to show the keyboard when body has touchAction: none on it.
    const prevTouchAction = document.body.style.touchAction
    document.body.style.touchAction = 'auto'
    // Multiple focus attempts — first immediate, then after iOS finishes
    // the modal mount animation. autoFocus alone doesn't reliably open the
    // iOS soft keyboard for programmatically-opened modals.
    const tries = [10, 100, 300, 600].map((delay) =>
      setTimeout(() => {
        const el = citySearchInputRef.current
        if (el) {
          el.focus()
          // Trigger iOS keyboard via click on focused element
          try { el.click() } catch {}
        }
      }, delay),
    )
    return () => {
      tries.forEach(clearTimeout)
      document.body.style.touchAction = prevTouchAction
    }
  }, [citySearchOpen])
  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>(() => getPlacedFurniture(ownerHandle))
  const [placingItem, setPlacingItem] = useState<string | null>(null)
  const [hideFurnitureCount, setHideFurnitureCount] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Fetch owner's tracks (NFTs + SCids)
  useEffect(() => {
    if (!ownerProfileId) { setLoading(false); return }
    fetch(`/api/feed/tracks?profileId=${ownerProfileId}&limit=20`)
      .then(r => r.json())
      .then(data => {
        // Deduplicate multi-edition tracks — show one frame per unique title
        const seen = new Set<string>()
        const ts = (data.tracks || []).filter((t: any) => {
          if (!t.id || !t.title) return false
          const key = t.title.toLowerCase().trim()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }).map((t: any) => ({
          ...t,
          playbackUrl: t.audioUrl || t.playbackUrl,
        })).slice(0, 16)
        setTracks(ts)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ownerProfileId])

  useEffect(() => {
    if (!containerRef.current || loading) return
    const container = containerRef.current
    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight - 200
    const themeCfg = THEME_CONFIG[theme]
    const isSportsTheme = theme === 'gym' || theme === 'blacktop'

    // ─── Phase 16.39 — Basketball SFX synthesized via Web Audio API ──
    // Zero external files, no licensing, no bundle weight. Each sound is
    // an oscillator/noise burst shaped via envelope to match its role.
    // Lazy-init the AudioContext on first user gesture (Chrome autoplay
    // policy) — the SHOOT button or any keypress is enough.
    let audioCtx: AudioContext | null = null
    const ensureAudioCtx = (): AudioContext | null => {
      if (audioCtx) return audioCtx
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!AC) return null
        audioCtx = new AC()
      } catch { audioCtx = null }
      return audioCtx
    }
    const playDribble = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(95, now)
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.22, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.1)
    }
    const playSwish = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.45), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 1.8)
        data[i] = (Math.random() * 2 - 1) * env
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 2400
      filter.Q.value = 1.2
      const gain = ctx.createGain()
      gain.gain.value = 0.28
      noise.connect(filter).connect(gain).connect(ctx.destination)
      noise.start(now); noise.stop(now + 0.45)
    }
    const playRim = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(2200, now)
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.22)
    }
    const playBackboard = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.14)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.18)
    }
    const playSqueak = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(1500 + Math.random() * 500, now)
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.1)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 0.13)
    }
    // Phase 16.71 — classic "DEFENSE! DEFENSE!" crowd chant. 8 cycles of
    // shaped noise burst at chant rhythm (~1.5Hz). Mid-band filtered to
    // sit where a crowd voice lands. Fires when opponent gets possession.
    const playDefenseChant = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const startNow = ctx.currentTime
      const cycles = 4
      for (let i = 0; i < cycles; i++) {
        const t0 = startNow + i * 0.72  // ~1.4Hz "DE-FENSE!" cadence
        // "DE" syllable
        for (let s = 0; s < 2; s++) {
          const t = t0 + s * 0.18
          const dur = 0.18
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
          const data = buf.getChannelData(0)
          for (let j = 0; j < data.length; j++) {
            const u = j / data.length
            const env = Math.min(1, u * 6) * Math.pow(1 - u, 1.2)
            data[j] = (Math.random() * 2 - 1) * env
          }
          const noise = ctx.createBufferSource()
          noise.buffer = buf
          const bp = ctx.createBiquadFilter()
          bp.type = 'bandpass'
          bp.frequency.value = s === 0 ? 600 : 800  // "DE" lower, "FENSE" higher
          bp.Q.value = 1.2
          const gain = ctx.createGain()
          gain.gain.value = 0.42 * (1 - i * 0.08)  // slight decay across cycles
          noise.connect(bp).connect(gain).connect(ctx.destination)
          noise.start(t); noise.stop(t + dur)
        }
      }
    }
    // Phase 16.71 — buzzer (quarter-end / game-end / shot-clock violation)
    const playBuzzer = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 240
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0, now)
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05)
      gain.gain.linearRampToValueAtTime(0.4, now + 0.9)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now); osc.stop(now + 1.05)
    }
    // Phase 16.44 — CROWD CHEER on shot makes. Layered noise burst shaped
    // like a roaring crowd: low rumble (sub 200Hz) + mid voice band (300-
    // 1200Hz) + high airy spray (3-5kHz) all under one envelope. ~1.2s
    // decay so it overlaps with the fan-jump animation.
    const playCheer = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return
      const now = ctx.currentTime
      const dur = 1.4
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length
        const env = Math.min(1, t * 8) * Math.pow(1 - t, 1.4)  // fast attack + decay
        data[i] = (Math.random() * 2 - 1) * env
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      // Mid-band: voice formant
      const mid = ctx.createBiquadFilter()
      mid.type = 'bandpass'
      mid.frequency.value = 700
      mid.Q.value = 0.6
      const midGain = ctx.createGain()
      midGain.gain.value = 0.32
      // High: airy spray (whistles + scream tail)
      const hi = ctx.createBiquadFilter()
      hi.type = 'bandpass'
      hi.frequency.value = 3400
      hi.Q.value = 0.9
      const hiGain = ctx.createGain()
      hiGain.gain.value = 0.18
      // Low: rumble
      const lo = ctx.createBiquadFilter()
      lo.type = 'lowpass'
      lo.frequency.value = 180
      const loGain = ctx.createGain()
      loGain.gain.value = 0.22
      noise.connect(mid).connect(midGain).connect(ctx.destination)
      noise.connect(hi).connect(hiGain).connect(ctx.destination)
      noise.connect(lo).connect(loGain).connect(ctx.destination)
      noise.start(now); noise.stop(now + dur)
    }
    // Phase 16.44 — ambient CROWD MURMUR. Filtered pink-ish noise at very
    // low volume that loops while the gym scene is alive. Adds presence
    // without competing with shot SFX. Started on first user gesture.
    const startCrowdMurmur = () => {
      const ctx = ensureAudioCtx(); if (!ctx) return null
      const dur = 8  // 8s looped buffer = no audible loop seam
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buf.getChannelData(0)
      // Pink-noise approximation via Paul Kellett's filter
      let b0 = 0, b1 = 0, b2 = 0
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + white * 0.0990460
        b1 = 0.96300 * b1 + white * 0.2965164
        b2 = 0.57000 * b2 + white * 1.0526913
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      noise.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 0.3
      const gain = ctx.createGain()
      gain.gain.value = 0.04  // VERY low — ambient bed only
      noise.connect(bp).connect(gain).connect(ctx.destination)
      noise.start()
      return { noise, gain }
    }

    // Phase 16.51 — PLAY-BY-PLAY ANNOUNCER (Web Speech API).
    // Synthesized voice over the speaker — no audio files needed, runs in
    // the same browser that's rendering the game. Cancels prior utterances
    // so back-to-back makes don't queue up. Volume kept lower than SFX so
    // the announcer rides above the swish/cheer mix without crushing it.
    let lastAnnounceAt = 0
    const speak = (text: string, opts?: { rate?: number; pitch?: number; volume?: number; minGapMs?: number }) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const minGap = opts?.minGapMs ?? 250
      const now = performance.now()
      if (now - lastAnnounceAt < minGap) return  // throttle so we don't stutter
      lastAnnounceAt = now
      try { window.speechSynthesis.cancel() } catch {}
      const u = new SpeechSynthesisUtterance(text)
      u.rate = opts?.rate ?? 1.15
      u.pitch = opts?.pitch ?? 0.95
      u.volume = opts?.volume ?? 0.85
      try { window.speechSynthesis.speak(u) } catch {}
    }
    // Phase 16.72 — STREETBALL VOCAB. SC games are park-court / Rucker
    // culture, NOT NBA. Strip every trademark-adjacent phrase (Mamba,
    // posterized, Zion-mode, "he's on fire" — that's NBA Jam, EA/Acclaim
    // IP). Replace with universal streetball lingo that's been spoken on
    // every blacktop for 30 years.
    const announceMake = (shotType: string, streak: number) => {
      if (streak >= 7) { speak(["COLD-BLOODED!", "HE'S COOKING!", "ICE IN THE VEINS!"][streak % 3], { pitch: 1.1, rate: 1.25 }); return }
      if (streak >= 5) { speak(["HOT HAND!", "CAN'T MISS!", "ABSOLUTELY COOKING!"][streak % 3], { pitch: 1.08, rate: 1.2 }); return }
      if (streak >= 3) { speak(["GETTING HOT!", "STARTING TO COOK!", "STAY WITH IT!"][streak % 3], { pitch: 1.05, rate: 1.15 }); return }
      if (shotType === 'dunk')     return speak(["GET UP! SLAM!", "ON 'EM!", "PARK LEGEND!", "TOO STRONG!", "BOOM! WINDMILL!"][Math.floor(Math.random()*5)], { pitch: 0.88, rate: 1.25 })
      if (shotType === 'three')    return speak(["BANG! TRIPLE!", "FROM DEEP!", "DROPS THE THREE!"][Math.floor(Math.random()*3)], { pitch: 1.0, rate: 1.18 })
      if (shotType === 'layup')    return speak(["EASY BUCKET!", "GOT THE LAY!", "AT THE RIM!"][Math.floor(Math.random()*3)], { rate: 1.15 })
      if (shotType === 'fadeaway') return speak(["FADEAWAY... GOOD!", "STEPBACK BUCKET!", "NOTHIN' BUT NET!"][Math.floor(Math.random()*3)], { rate: 1.12 })
      return speak(["MONEY!", "BUCKET!", "GOT IT!", "SPLASH!"][Math.floor(Math.random()*4)], { rate: 1.15 })
    }
    const announceMiss = (shotType: string) => {
      // 30% chance to comment on misses so it's not chatty
      if (Math.random() > 0.30) return
      if (shotType === 'dunk') return speak(["OH NO, OFF THE RIM!", "MISSED THE SLAM!"][Math.floor(Math.random()*2)], { pitch: 0.92 })
      speak(["NO GOOD!", "RATTLES OUT!", "SHORT!", "OFF THE MARK"][Math.floor(Math.random()*4)], { rate: 1.05 })
    }
    const announceMove = (move: string) => {
      if (move === 'block')   return speak(["DENIED!", "REJECTED!", "GET THAT OUTTA HERE!"][Math.floor(Math.random()*3)], { pitch: 0.92, rate: 1.2 })
      if (move === 'rebound') return speak(["BOARDS!", "REBOUND!"][Math.floor(Math.random()*2)], { rate: 1.15 })
      if (move === 'crossover') return speak(["ANKLES!", "BROKE 'EM!", "TOO SMOOTH!"][Math.floor(Math.random()*3)], { rate: 1.18 })
      if (move === 'spin')    return speak(["SPIN MOVE!", "SHIFTY!"][Math.floor(Math.random()*2)], { rate: 1.15 })
    }

    // Phase 16.59 — difficulty-tuned AI values
    const getDiff = () => {
      const d = difficultyRef.current
      if (d === 'easy')  return { speedMul: 0.65, blockChance: 0.15, contestRange: 1.6,  blockRange: 1.0, accuracy: 0.40, shootTimer: 3.0 }
      if (d === 'hard')  return { speedMul: 0.95, blockChance: 0.50, contestRange: 2.5,  blockRange: 1.4, accuracy: 0.70, shootTimer: 1.2 }
      return                  { speedMul: 0.85, blockChance: 0.30, contestRange: 2.0,  blockRange: 1.2, accuracy: 0.55, shootTimer: 2.0 }
    }

    // Phase 16.51 — score popup + camera shake helpers.
    // Popups: project world position → screen coords once at spawn, render
    // as absolute-positioned DOM div, CSS animates the float-up + fade.
    const projectToScreen = (worldX: number, worldY: number, worldZ: number) => {
      const v = new THREE.Vector3(worldX, worldY, worldZ).project(camera)
      const canvasW = renderer.domElement.clientWidth
      const canvasH = renderer.domElement.clientHeight
      return {
        x: (v.x * 0.5 + 0.5) * canvasW,
        y: (-v.y * 0.5 + 0.5) * canvasH,
      }
    }
    const spawnScorePopup = (p: { text: string; color: string; worldX: number; worldY: number; worldZ: number }) => {
      const screen = projectToScreen(p.worldX, p.worldY, p.worldZ)
      const id = scorePopupIdRef.current++
      const popup: ScorePopup = {
        id,
        text: p.text,
        color: p.color,
        screenX: screen.x,
        screenY: screen.y,
        bornAt: performance.now(),
      }
      setScorePopups((prev) => [...prev, popup])
      setTimeout(() => {
        setScorePopups((prev) => prev.filter((sp) => sp.id !== id))
      }, 1400)
    }
    const triggerCameraShake = (intensity: number, durationSec: number) => {
      cameraShakeRef.current = { intensity, t: 0, duration: durationSec }
    }
    // Phase 16.58 — Big Play Cam: full-screen banner for signature moments
    const triggerBigPlay = (text: string, color: string, emoji: string) => {
      const id = bigPlayIdRef.current++
      setBigPlay({ id, text, color, emoji, bornAt: performance.now() })
      setTimeout(() => {
        setBigPlay((cur) => (cur && cur.id === id ? null : cur))
      }, 1600)
    }
    // Phase 16.58 — per-shot stats tracker
    const recordAttempt = (shotType: string) => {
      setGameStats((s) => {
        const key = (s[shotType] ? shotType : 'jumpshot')
        return { ...s, [key]: { ...s[key], attempts: s[key].attempts + 1 } }
      })
    }
    const recordMake = (shotType: string) => {
      setGameStats((s) => {
        const key = (s[shotType] ? shotType : 'jumpshot')
        return { ...s, [key]: { ...s[key], makes: s[key].makes + 1 } }
      })
    }
    // Phase 16.52 — hot zones. Court divided into 4u × 4u grid cells.
    // Cells with 2+ makes glow orange; cells with 4+ makes glow red. The
    // visual heatmap is a CanvasTexture overlay set up in the basketball
    // gallery block; here we just paint it.
    const zoneKey = (x: number, z: number) => `${Math.floor(x / 4)}_${Math.floor(z / 4)}`
    const repaintHeatmap = () => {
      const hm = (scene as any).userData?.heatmap
      if (!hm) return
      const { ctx, canvas, texture, courtWidth, courtSpan, courtZ } = hm
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      hotZoneRef.current.forEach((data, k) => {
        const parts = k.split('_').map(Number)
        const ix = parts[0]
        const iz = parts[1]
        const worldX = ix * 4 + 2  // cell center
        const worldZ = iz * 4 + 2
        const canvasX = ((worldX + courtWidth / 2) / courtWidth) * canvas.width
        const canvasY = ((worldZ - courtZ + courtSpan / 2) / courtSpan) * canvas.height
        const heat = Math.min(1, data.makes / 5)
        const radius = 50 + data.makes * 10
        const color = data.makes >= 4 ? '255,40,40' : data.makes >= 2 ? '255,140,40' : '255,200,60'
        const grad = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, radius)
        grad.addColorStop(0, `rgba(${color},${0.7 * heat})`)
        grad.addColorStop(0.6, `rgba(${color},${0.35 * heat})`)
        grad.addColorStop(1, `rgba(${color},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2)
        ctx.fill()
      })
      texture.needsUpdate = true
    }
    const registerMakeAt = (x: number, z: number) => {
      const k = zoneKey(x, z)
      const cur = hotZoneRef.current.get(k) || { makes: 0, lastMakeAt: 0 }
      hotZoneRef.current.set(k, { makes: cur.makes + 1, lastMakeAt: performance.now() })
      repaintHeatmap()
    }

    // ─── Scene Setup ─────────────────────────────────────────
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(themeCfg.floor).multiplyScalar(0.5)
    // City fog reaches MUCH farther for open-world feel; gallery rooms stay tight.
    scene.fog = theme === 'city'
      ? new THREE.Fog(0x1a0e08, 60, 220)
      : new THREE.Fog(themeCfg.floor, 30, 80)

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200)
    camera.position.set(0, 2.5, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // Phase 16.66 — modern color pipeline. sRGB output + ACES filmic
    // tonemapping = same color science 2K + GTA + most modern game engines
    // use. Without these, MeshStandardMaterial colors read flat + over-
    // saturated. With them, the floor reads as lacquered wood, the rim
    // pops with proper highlight rolloff, and bloom doesn't blow out.
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    container.appendChild(renderer.domElement)

    // Phase 16.66 — IBL via procedural RoomEnvironment. Adds image-based
    // lighting that gives MeshStandardMaterial real reflection +
    // ambient response without needing an HDR cubemap download.
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new RoomEnvironment()
    const envTexture = pmrem.fromScene(envScene, 0.04).texture
    scene.environment = envTexture
    // Don't override scene.background — themes set their own clear color
    // / sky. Environment only drives material reflection + IBL.
    pmrem.dispose()

    // Phase 16.66 — Bloom + final composite. Same EffectComposer pipeline
    // every modern three.js demo uses. UnrealBloomPass thresholds at 0.85
    // so only properly emissive surfaces (rim, score banners, scanner
    // lights) bloom; the floor + walls stay sharp.
    const composer = new EffectComposer(renderer)
    composer.setSize(w, h)
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    composer.addPass(new RenderPass(scene, camera))
    // Phase 16.69 — bloom toned down on sports themes (emissives + IBL
    // were stacking with bloom to wash out gym/blacktop white).
    const isSportsBloom = theme === 'gym' || theme === 'blacktop'
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      isSportsBloom ? 0.25 : 0.55,   // strength
      isSportsBloom ? 0.40 : 0.55,   // radius
      isSportsBloom ? 0.95 : 0.85,   // threshold (raise so only HOT pixels bloom)
    )
    composer.addPass(bloomPass)

    // ─── Lighting ────────────────────────────────────────────
    // Phase 16.69 — sports themes get DIMMED globals because gym/blacktop
    // add their OWN dedicated overhead light rigs (9 panels in gym, lamp
    // pole + bulb on blacktop). Without the dim, all the lights compound
    // with bloom + IBL + ACES exposure → white-out (Frank: "look at how
    // bright the gym is now?!!").
    const isSportsLight = theme === 'gym' || theme === 'blacktop'
    const ambient = new THREE.AmbientLight(themeCfg.ambient, isSportsLight ? 0.25 : 0.6)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, isSportsLight ? 0.6 : 1.2)
    dir.position.set(5, 15, 5)
    dir.castShadow = true
    scene.add(dir)
    const accentLight = new THREE.PointLight(themeCfg.accent, isSportsLight ? 0.4 : 1.5, 30)
    accentLight.position.set(0, 6, 0)
    scene.add(accentLight)
    // Phase 16.69 — drop tone-mapping exposure on sports themes so the
    // many emissive surfaces (rim, hot-zone tiles, panels) don't bloom out.
    if (isSportsLight) renderer.toneMappingExposure = 0.75

    // ─── Floor ───────────────────────────────────────────────
    // Phase 16.25 — city theme gets a HUGE 200x200 asphalt floor (open world);
    // gallery themes keep the original 40x40 enclosed room floor.
    // Theme flags — hoisted so basketball + walls blocks can both use them
    const isOutdoor = theme === 'city' || theme === 'blacktop'
    const isGymCourt = theme === 'gym'
    const isBlacktopCourt = theme === 'blacktop'
    const isBasketballGallery = isGymCourt || isBlacktopCourt
    const floorSize = theme === 'city' ? 200 : (theme === 'gym' ? 60 : theme === 'blacktop' ? 50 : 40)
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize)
    let floorMat: THREE.MeshStandardMaterial
    if (theme === 'city') {
      floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.05, roughness: 0.95 })
    } else if (theme === 'gym') {
      // Wood floor with plank grain via canvas texture
      const woodCanvas = document.createElement('canvas')
      woodCanvas.width = 512; woodCanvas.height = 512
      const wctx = woodCanvas.getContext('2d')!
      wctx.fillStyle = '#c8a060'; wctx.fillRect(0, 0, 512, 512)
      // Plank lines
      wctx.strokeStyle = '#8a6a3a'; wctx.lineWidth = 1
      for (let y = 0; y < 512; y += 32) {
        wctx.beginPath(); wctx.moveTo(0, y); wctx.lineTo(512, y); wctx.stroke()
      }
      // Grain variation
      for (let i = 0; i < 200; i++) {
        wctx.fillStyle = `rgba(120,80,40,${0.05 + Math.random() * 0.15})`
        wctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 80, 2)
      }
      const woodTex = new THREE.CanvasTexture(woodCanvas)
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
      woodTex.repeat.set(6, 6)
      // Phase 16.66 — lacquered hardwood. Lower roughness + IBL means
      // the wood reflects the gym lights for a glossy real-floor read.
      // Higher envMapIntensity pushes the IBL contribution so the gloss
      // is visible without blowing out the diffuse wood color.
      floorMat = new THREE.MeshStandardMaterial({ map: woodTex, metalness: 0.05, roughness: 0.35, envMapIntensity: 1.4 })
    } else if (theme === 'blacktop') {
      // Phase 16.66 — wet asphalt: slightly reflective, still rough
      floorMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.05, roughness: 0.72, envMapIntensity: 0.8 })
    } else {
      floorMat = new THREE.MeshStandardMaterial({ color: themeCfg.floor, metalness: 0.6, roughness: 0.3 })
    }
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Phase 16.12 — CITY THEME: street markings, brick storefronts, awnings,
    // alley gaps, billboards. Builds on top of the existing wall structure
    // so frames/tracks still work; just adds GTA/NBA2K-style city ambiance.
    if (isBasketballGallery) {
      // Phase 16.39 — SoundChain Shootaround basketball court setup.
      // Both gym (indoor) and blacktop (outdoor) get a real NBA-style court.
      // gym = full-court with 2 hoops + bleachers
      // blacktop = half-court with 1 hoop + chain-link fence
      const courtZ = 0           // center of court
      const courtSpan = isGymCourt ? 28 : 14   // full court vs half-court
      const courtWidth = 15

      // Court boundary paint
      const courtMat = new THREE.MeshStandardMaterial({
        color: isGymCourt ? 0xb8893c : 0x3a3f44,
        roughness: 0.5,
        metalness: 0.1,
      })
      const court = new THREE.Mesh(new THREE.PlaneGeometry(courtWidth, courtSpan), courtMat)
      court.rotation.x = -Math.PI / 2
      court.position.set(0, 0.02, courtZ)
      court.receiveShadow = true
      scene.add(court)
      // White boundary
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const mkLine = (w: number, h: number, x: number, z: number) => {
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat)
        ln.rotation.x = -Math.PI / 2
        ln.position.set(x, 0.03, z)
        scene.add(ln)
      }
      mkLine(courtWidth, 0.1, 0, courtZ - courtSpan / 2)  // baseline
      mkLine(courtWidth, 0.1, 0, courtZ + courtSpan / 2)  // baseline
      mkLine(0.1, courtSpan, -courtWidth / 2, courtZ)     // sideline L
      mkLine(0.1, courtSpan, courtWidth / 2, courtZ)      // sideline R
      // Build hoops + key paint per court type
      const hoopPositions: Array<{ z: number; flip: boolean }> = []
      if (isGymCourt) {
        // Full court: half-court line + 2 keys + 2 hoops
        mkLine(courtWidth, 0.1, 0, courtZ)  // half-court line
        const center = new THREE.Mesh(new THREE.RingGeometry(1.83, 1.93, 32), lineMat)  // NBA 6 ft (1.83m)
        // Phase 16.70 — center court SC logo (gym only). CanvasTexture
        // painted with the SC mark; mounted as a flat disc inside the
        // center circle. Reads as the team logo NBA courts have at mid-court.
        if (isGymCourt) {
          const logoCanvas = document.createElement('canvas')
          logoCanvas.width = 512; logoCanvas.height = 512
          const lctx = logoCanvas.getContext('2d')!
          // Background circle (dark wood tone) with rim
          lctx.fillStyle = 'rgba(40,20,10,0.35)'
          lctx.beginPath(); lctx.arc(256, 256, 240, 0, Math.PI * 2); lctx.fill()
          // SC mark — large stacked monogram
          lctx.fillStyle = '#fbbf24'  // gold
          lctx.font = 'bold 280px "Courier New", monospace'
          lctx.textAlign = 'center'
          lctx.textBaseline = 'middle'
          lctx.fillText('SC', 256, 256)
          // Arc text top: SOUNDCHAIN
          lctx.fillStyle = '#facc15'
          lctx.font = 'bold 38px "Courier New", monospace'
          lctx.textBaseline = 'alphabetic'
          const arcText = 'SOUNDCHAIN'
          lctx.save(); lctx.translate(256, 256)
          for (let i = 0; i < arcText.length; i++) {
            const angle = -Math.PI / 2 + (i - (arcText.length - 1) / 2) * 0.20
            lctx.save()
            lctx.rotate(angle)
            lctx.fillText(arcText[i], 0, -200)
            lctx.restore()
          }
          lctx.restore()
          const logoTex = new THREE.CanvasTexture(logoCanvas)
          const logo = new THREE.Mesh(
            new THREE.CircleGeometry(1.8, 48),
            new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.85, depthWrite: false }),
          )
          logo.rotation.x = -Math.PI / 2
          logo.position.set(0, 0.04, courtZ)
          scene.add(logo)
        }
        center.rotation.x = -Math.PI / 2
        center.position.set(0, 0.03, courtZ)
        scene.add(center)
        hoopPositions.push({ z: courtZ - courtSpan / 2 + 1.5, flip: false })
        hoopPositions.push({ z: courtZ + courtSpan / 2 - 1.5, flip: true })
      } else {
        hoopPositions.push({ z: courtZ - courtSpan / 2 + 1.5, flip: false })
      }

      const hoopList: Array<{ rimPos: THREE.Vector3; rim?: THREE.Mesh; rimMat?: THREE.MeshStandardMaterial }> = []
      hoopPositions.forEach(({ z, flip }) => {
        const dir = flip ? -1 : 1
        const baseZ = z
        // Free-throw line + key
        // Phase 16.69 — NBA-spec dimensions (1 unit = 1 meter):
        //   Free throw line   4.57m from baseline (15 ft)
        //   Key paint         4.88m wide × 4.57m long (16 ft × 15 ft)
        //   3-point arc       7.24m radius from basket (23' 9")
        //   Corner-3 lines    6.70m from court center (22 ft)
        //   Rim center        1.22m from baseline (4 ft)
        //   Rim radius        0.225m (NBA standard 0.45m diameter)
        //   Rim height        3.05m (10 ft)
        //   Backboard         1.83m × 1.07m, 0.15m behind rim
        // baseZ is 1.5m IN from baseline (hoopPositions offset above),
        // so baselineZ = baseZ - 1.5*dir.
        const baselineZ = baseZ - 1.5 * dir
        const ftLineZ = baselineZ + 4.57 * dir
        const keyCenterZ = baselineZ + (4.57 / 2) * dir
        const basketZ = baselineZ + 1.22 * dir  // rim center
        mkLine(4.88, 0.1, 0, ftLineZ)            // free throw line at 4.57m
        const keyPaint = new THREE.Mesh(
          new THREE.PlaneGeometry(4.88, 4.57),
          new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.4 }),
        )
        keyPaint.rotation.x = -Math.PI / 2
        keyPaint.position.set(0, 0.025, keyCenterZ)
        scene.add(keyPaint)
        // Three-point line — basket-centered arc + corner-3 straight segments.
        // True NBA dimensions now (7.24m arc / 6.70m corner-3) — fits inside
        // the 15m-wide court with 0.8m clearance to each sideline.
        const arc3R = 7.24
        const corner3X = 6.70
        // Corner-3 straight lines (parallel to sideline, at x = ±arc3R)
        const corner3StartZ = baseZ - 1.5 * dir  // at baseline
        const corner3EndZ = basketZ              // where arc starts
        const corner3MidZ = (corner3StartZ + corner3EndZ) / 2
        const corner3Len = Math.abs(corner3EndZ - corner3StartZ)
        for (const xSign of [-1, 1]) {
          const corner3Line = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, corner3Len),
            lineMat,
          )
          corner3Line.rotation.x = -Math.PI / 2
          corner3Line.position.set(xSign * corner3X, 0.03, corner3MidZ)
          scene.add(corner3Line)
        }
        // Arc — basket-centered, clamped to corner-3 line meeting points.
        // angle where arc reaches corner-3 X: asin(corner3X / arc3R)
        const arcEndAngle = Math.asin(corner3X / arc3R)
        for (let a = -arcEndAngle; a <= arcEndAngle; a += 0.04) {
          const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.08), lineMat)
          seg.rotation.x = -Math.PI / 2
          seg.rotation.z = a + Math.PI / 2
          seg.position.set(Math.sin(a) * arc3R, 0.03, basketZ + Math.cos(a) * arc3R * dir)
          scene.add(seg)
        }
        // Hoop pole + backboard + rim
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.15, 4, 12),
          new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 }),
        )
        // Pole at backboard z + 0.5m (the stanchion behind the backboard)
        const backboardZ = basketZ - 0.15 * dir  // 0.15m back from rim
        pole.position.set(0, 2, backboardZ - 0.5 * dir)
        pole.castShadow = true
        scene.add(pole)
        // NBA backboard: 1.83m × 1.07m, centered vertically around y=3.59m
        // (top edge at 4.05m, bottom at 3.05m — rim height = backboard bottom).
        const backboard = new THREE.Mesh(
          new THREE.BoxGeometry(1.83, 1.07, 0.05),
          new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            metalness: 0.0,
            roughness: 0.05,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            transmission: 0.65,
            ior: 1.5,
            envMapIntensity: 1.6,
          }),
        )
        backboard.position.set(0, 3.59, backboardZ)
        backboard.castShadow = true
        scene.add(backboard)
        // NBA shooter's square: 0.61m × 0.45m, painted on backboard
        // just above the rim
        const sqOutline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.61, 0.45)),
          new THREE.LineBasicMaterial({ color: 0xdc2626 }),
        )
        sqOutline.position.set(0, 3.30, backboardZ + 0.04 * dir)
        scene.add(sqOutline)
        // NBA rim: 0.45m diameter (0.225m radius), 0.02m tube, 3.05m height
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 1.4, metalness: 0.85, roughness: 0.2, envMapIntensity: 1.5 })
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.225, 0.02, 12, 32),
          rimMat,
        )
        const rimPos = new THREE.Vector3(0, 3.05, basketZ)
        rim.position.copy(rimPos)
        rim.rotation.x = Math.PI / 2
        rim.castShadow = true
        scene.add(rim)
        hoopList.push({ rimPos, rim, rimMat })
        // Net (12 segments, scaled to NBA rim radius 0.225m, length 0.4m
        // hanging from rim height 3.05m down to 2.65m)
        const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        for (let ni = 0; ni < 12; ni++) {
          const a = (ni / 12) * Math.PI * 2
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.4, 4), netMat)
          seg.position.set(Math.cos(a) * 0.21, 2.85, rimPos.z + Math.sin(a) * 0.21)
          scene.add(seg)
        }
      })
      // Store ALL hoop positions in scene.userData so basketball mechanic
      // can target the NEAREST one (full court has 2 hoops).
      ;(scene.userData as any).hoops = hoopList

      // Phase 16.74 — RIM FLASH. Visible feedback when ball passes through
      // (green) or clanks off (red). Bumps emissive color + intensity for
      // ~0.5s then eases back. Wired from gravity()'s score-detect branch.
      const _baseRimColor = new THREE.Color(0xea580c)
      const flashRim = (rimMat: THREE.MeshStandardMaterial | undefined, hex: number, intensity: number, durationMs = 500) => {
        if (!rimMat) return
        rimMat.emissive.setHex(hex)
        rimMat.emissiveIntensity = intensity
        setTimeout(() => {
          // Ease back to orange-rim baseline
          rimMat.emissive.copy(_baseRimColor)
          rimMat.emissiveIntensity = 1.4
        }, durationMs)
      }
      ;(scene.userData as any).flashRim = flashRim

      // Phase 16.52 — HOT ZONE heatmap overlay. CanvasTexture painted at
      // game spawn; updated each frame (or on score events) from
      // hotZoneRef. Mounted as a thin transparent plane just above the
      // court so makes from "money spots" visibly burn the floor orange/
      // red. Same trick NBA broadcasts use for shot chart overlays.
      const heatCanvas = document.createElement('canvas')
      heatCanvas.width = 256
      heatCanvas.height = 512
      const heatCtx = heatCanvas.getContext('2d')!
      const heatTexture = new THREE.CanvasTexture(heatCanvas)
      heatTexture.needsUpdate = true
      const heatPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(courtWidth, courtSpan),
        new THREE.MeshBasicMaterial({ map: heatTexture, transparent: true, opacity: 0.65, depthWrite: false }),
      )
      heatPlane.rotation.x = -Math.PI / 2
      heatPlane.position.set(0, 0.05, courtZ)  // just above court line markings
      heatPlane.renderOrder = 1
      scene.add(heatPlane)
      ;(scene.userData as any).heatmap = {
        canvas: heatCanvas,
        ctx: heatCtx,
        texture: heatTexture,
        courtWidth,
        courtSpan,
        courtZ,
      }

      // Phase 16.55 — AI DEFENDER. Primitive humanoid in red jersey + dark
      // skin tone for visual contrast against player's XBot. Lives in
      // scene.userData.defender so animate loop can tick AI behavior.
      const defGroup = new THREE.Group()
      defGroup.position.set(0, 0, hoopList[0] ? hoopList[0].rimPos.z + 4 : -8)
      // Head + hair
      const defSkin = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 })
      const defJersey = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xdc2626, emissiveIntensity: 0.15, roughness: 0.6 })
      const defShorts = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
      const defShoe = new THREE.MeshStandardMaterial({ color: 0xfff5dd, roughness: 0.4 })
      const defHair = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 })
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), defSkin)
      dHead.position.set(0, 1.86, 0); dHead.castShadow = true; defGroup.add(dHead)
      const dHair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), defHair)
      dHair.position.set(0, 1.88, 0); dHair.castShadow = true; defGroup.add(dHair)
      const dTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.28), defJersey)
      dTorso.position.set(0, 1.4, 0); dTorso.castShadow = true; defGroup.add(dTorso)
      const dHips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.3), defShorts)
      dHips.position.set(0, 1.0, 0); dHips.castShadow = true; defGroup.add(dHips)
      // Arms (capsules, no swing — defender just slides for v1)
      for (const xSign of [-1, 1]) {
        const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), defSkin)
        upperArm.position.set(xSign * 0.32, 1.42, 0)
        upperArm.castShadow = true
        defGroup.add(upperArm)
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), defSkin)
        forearm.position.set(xSign * 0.32, 1.02, 0)
        forearm.castShadow = true
        defGroup.add(forearm)
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), defSkin)
        hand.position.set(xSign * 0.32, 0.74, 0)
        hand.castShadow = true
        defGroup.add(hand)
      }
      // Legs
      for (const xSign of [-1, 1]) {
        const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.36, 4, 8), defSkin)
        upperLeg.position.set(xSign * 0.12, 0.68, 0); upperLeg.castShadow = true
        defGroup.add(upperLeg)
        const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 4, 8), defSkin)
        lowerLeg.position.set(xSign * 0.12, 0.24, 0); lowerLeg.castShadow = true
        defGroup.add(lowerLeg)
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.32), defShoe)
        shoe.position.set(xSign * 0.12, 0.045, 0.04); shoe.castShadow = true
        defGroup.add(shoe)
      }
      // Number "1" badge on jersey
      const numCanvas = document.createElement('canvas')
      numCanvas.width = 64; numCanvas.height = 64
      const nctx = numCanvas.getContext('2d')!
      nctx.fillStyle = 'white'
      nctx.font = 'bold 50px monospace'
      nctx.textAlign = 'center'
      nctx.fillText('D', 32, 50)
      const numTex = new THREE.CanvasTexture(numCanvas)
      const numPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.25),
        new THREE.MeshBasicMaterial({ map: numTex, transparent: true }),
      )
      numPlane.position.set(0, 1.45, 0.15)
      defGroup.add(numPlane)
      scene.add(defGroup)
      ;(scene.userData as any).defender = {
        group: defGroup,
        targetX: 0, targetZ: 0,
        speed: 0,
        mode: 'guard',         // 'guard' | 'drive'
        shootTimer: 0,         // seconds until defender shoots while in drive
      }

      // Phase 16.57 — DEFENDER OFFENSE. Picks up rebounds, drives to rim,
      // shoots. Score detection in gravity() reads ballState.owner to
      // decide which side gets points.
      const defenderShoot = () => {
        const defState = (scene.userData as any).defender
        if (!defState?.group || !hoopList[0]) return
        // Find rim defender is closest to
        let target: THREE.Vector3 | null = null
        let nearest = Infinity
        for (const h of hoopList) {
          const d = defState.group.position.distanceTo(h.rimPos)
          if (d < nearest) { nearest = d; target = h.rimPos.clone() }
        }
        if (!target) return
        const start = ballBG.position.clone()
        const dx = target.x - start.x
        const dz = target.z - start.z
        const horizDist = Math.hypot(dx, dz)
        // Difficulty-tuned accuracy
        const diffShoot = getDiff()
        if (Math.random() > diffShoot.accuracy) {
          target.x += (Math.random() - 0.5) * 0.5
          target.z += (Math.random() - 0.5) * 0.4
          target.y -= 0.25
        }
        const apexY = target.y + 2.0
        const g = 9.8 * 1.5
        const timeUp = 0.4
        const timeDown = 0.55
        const releaseY = 2.5
        const vy = (apexY - releaseY) / timeUp + 0.5 * g * timeUp
        const totalTime = timeUp + timeDown
        ballBG.position.set(start.x, releaseY, start.z)
        ballStateBG.vel.set(dx / totalTime, vy, dz / totalTime)
        ballStateBG.held = false
        ballStateBG.scoredThisShot = false
        ballStateBG.airborneFrames = 0
        ;(ballStateBG as any).rimHitThisShot = false
        ;(ballStateBG as any).bbHitThisShot = false
        ;(ballStateBG as any).airTime = 0
        ;(ballStateBG as any).bounces = 0
        ballStateBG.returnTimer = 0
        ;(ballStateBG as any).owner = 'defender'
        ;(ballStateBG as any).shotType = horizDist > 7 ? 'three' : (horizDist < 2.5 ? 'dunk' : 'jumpshot')
        defState.mode = 'guard'
        defState.shootTimer = 0
        speak(["DEFENDER PULLS UP!", "OPPONENT JUMPER!", "BIG MAN SHOOTS!"][Math.floor(Math.random()*3)], { pitch: 0.95, rate: 1.18 })
        setHoopScore((s) => ({ ...s, attempts: s.attempts + 1 }))
      }
      ;(scene.userData as any).defenderShoot = defenderShoot

      // Blacktop-specific: chain-link fence around court
      if (isBlacktopCourt) {
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.55, wireframe: true })
        const fenceH = 4.5
        const fenceGeo = new THREE.PlaneGeometry(courtWidth + 2, fenceH, 24, 6)
        ;[{ z: courtZ + courtSpan / 2 + 1, rot: 0 }, { z: courtZ - courtSpan / 2 - 1, rot: 0 }].forEach(({ z, rot }) => {
          const fence = new THREE.Mesh(fenceGeo, fenceMat)
          fence.position.set(0, fenceH / 2, z)
          fence.rotation.y = rot
          scene.add(fence)
        })
        ;[-courtWidth / 2 - 1, courtWidth / 2 + 1].forEach((x) => {
          const sideFenceGeo = new THREE.PlaneGeometry(courtSpan + 2, fenceH, 24, 6)
          const fence = new THREE.Mesh(sideFenceGeo, fenceMat)
          fence.position.set(x, fenceH / 2, courtZ)
          fence.rotation.y = Math.PI / 2
          scene.add(fence)
        })
        // Streetlight
        const lampPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x222222 }),
        )
        lampPole.position.set(courtWidth / 2 + 2, 4, courtZ - 3)
        scene.add(lampPole)
        const lampBulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xfff7c2, emissiveIntensity: 0.8 }),
        )
        lampBulb.position.set(courtWidth / 2 + 1.5, 7.5, courtZ - 3)
        scene.add(lampBulb)
        const courtLight = new THREE.PointLight(0xfff7c2, 1.2, 30)
        courtLight.position.copy(lampBulb.position)
        scene.add(courtLight)
      }

      // Gym-specific: bleachers along both long sides
      if (isGymCourt) {
        const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 })
        ;[-courtWidth / 2 - 3, courtWidth / 2 + 3].forEach((x) => {
          for (let row = 0; row < 4; row++) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, courtSpan), bleacherMat)
            bench.position.set(x + (x > 0 ? row * 1.5 : -row * 1.5), 0.4 + row * 0.7, 0)
            bench.castShadow = true
            scene.add(bench)
          }
        })

        // Phase 16.44 — FANS IN THE STANDS. InstancedMesh for torso + head
        // gives 2 draw calls for ALL fans no matter how many. Each fan has
        // its own random shirt color (10 jersey palette), idle bounce phase
        // offset, and excited-until timer. Cheer trigger (called from
        // playSwish hook on every make) sets every fan to excited mode for
        // 1.5-2.5s — instances jump up + slight rotation. Idle fans sway
        // gently in their seats. Crowd murmur ambient loop starts on first
        // user gesture.
        const FAN_PALETTE = [
          0xdc2626, 0xea580c, 0xf59e0b, 0xeab308,  // arena-red/orange/amber
          0x16a34a, 0x059669, 0x0891b2, 0x0284c7,  // green/teal/cyan/blue
          0x7c3aed, 0xa21caf, 0xdb2777, 0xe11d48,  // purple/fuchsia/pink/rose
        ]
        const ROWS = 4
        const PER_BENCH = 14
        const FAN_COUNT = ROWS * PER_BENCH * 2
        const torsoMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 })
        const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 })
        const torsoMesh = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.42, 0.58, 0.3), torsoMat, FAN_COUNT,
        )
        const headMesh = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.14, 8, 6), headMat, FAN_COUNT,
        )
        torsoMesh.castShadow = true
        headMesh.castShadow = true
        type FanState = {
          baseX: number; baseY: number; baseZ: number
          phase: number; armsUp: boolean
          excitedUntil: number; jumpY: number; tilt: number
        }
        const fanArray: FanState[] = []
        const fanMtx = new THREE.Matrix4()
        const fanQuat = new THREE.Quaternion()
        const fanPos = new THREE.Vector3()
        const fanScale = new THREE.Vector3(1, 1, 1)
        const tmpColor = new THREE.Color()
        let fanIdx = 0
        ;[-1, 1].forEach((sideSign) => {
          const sideBaseX = sideSign * (courtWidth / 2 + 3)
          for (let row = 0; row < ROWS; row++) {
            const seatX = sideBaseX + sideSign * row * 1.5
            const seatY = 0.4 + row * 0.7 + 0.55  // bench top + half torso
            for (let s = 0; s < PER_BENCH; s++) {
              const seatZ = -courtSpan / 2 + 1 + s * (courtSpan - 2) / (PER_BENCH - 1)
              const armsUp = Math.random() < 0.18  // 18% have arms up at all times
              fanArray.push({
                baseX: seatX, baseY: seatY, baseZ: seatZ,
                phase: Math.random() * Math.PI * 2,
                armsUp,
                excitedUntil: 0, jumpY: 0, tilt: 0,
              })
              fanPos.set(seatX, seatY, seatZ)
              fanQuat.identity()
              fanMtx.compose(fanPos, fanQuat, fanScale)
              torsoMesh.setMatrixAt(fanIdx, fanMtx)
              fanPos.set(seatX, seatY + 0.45, seatZ)
              fanMtx.compose(fanPos, fanQuat, fanScale)
              headMesh.setMatrixAt(fanIdx, fanMtx)
              tmpColor.set(FAN_PALETTE[Math.floor(Math.random() * FAN_PALETTE.length)])
              torsoMesh.setColorAt(fanIdx, tmpColor)
              fanIdx++
            }
          }
        })
        torsoMesh.instanceMatrix.needsUpdate = true
        if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true
        headMesh.instanceMatrix.needsUpdate = true
        scene.add(torsoMesh, headMesh)
        ;(scene.userData as any).crowd = {
          fanArray, torsoMesh, headMesh,
          fanMtx, fanQuat, fanPos, fanScale,
          axisX: new THREE.Vector3(1, 0, 0),
          cheer: () => {
            const t = performance.now()
            for (const f of fanArray) {
              f.excitedUntil = t + 1500 + Math.random() * 900
            }
            playCheer()
          },
        }
        // Ambient crowd murmur — starts on first user gesture (audio ctx
        // policy). Cached on userData so we don't double-start.
        const tryStartMurmur = () => {
          if ((scene.userData as any).crowdMurmurStarted) return
          const handle = startCrowdMurmur()
          if (handle) (scene.userData as any).crowdMurmurStarted = true
        }
        window.addEventListener('pointerdown', tryStartMurmur, { once: true })
        window.addEventListener('keydown', tryStartMurmur, { once: true })
        // Phase 16.69 — gym overhead lights tuned WAY DOWN. 9 panels
        // × 1.5 intensity + 0.9 emissive + bloom + IBL = white-out.
        // Now: emissive 0.35 (still visibly glowing), light 0.5 (covers
        // the room without blowing out), 4 panels instead of 9.
        for (let lx = -8; lx <= 8; lx += 8) {
          for (let lz = -8; lz <= 8; lz += 8) {
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(3, 0.1, 1),
              new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8e0, emissiveIntensity: 0.35 }),
            )
            panel.position.set(lx, 21.5, lz)
            scene.add(panel)
          }
        }
        // Just 2 mid-court overhead point lights cover the whole gym
        for (const lz of [-6, 6]) {
          const gymLight = new THREE.PointLight(0xfff8e0, 0.5, 40)
          gymLight.position.set(0, 19, lz)
          scene.add(gymLight)
        }
        // Scoreboard above mid-court
        const scoreCanvas = document.createElement('canvas')
        scoreCanvas.width = 512; scoreCanvas.height = 128
        const scx = scoreCanvas.getContext('2d')!
        scx.fillStyle = '#0a0a0a'; scx.fillRect(0, 0, 512, 128)
        scx.strokeStyle = '#dc2626'; scx.lineWidth = 6; scx.strokeRect(8, 8, 496, 112)
        scx.fillStyle = '#dc2626'; scx.font = 'bold 60px monospace'; scx.textAlign = 'center'
        scx.fillText('🏀 OPEN GYM', 256, 80)
        const scoreTex = new THREE.CanvasTexture(scoreCanvas)
        const scoreboard = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 2),
          new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0xdc2626, emissiveIntensity: 0.3, emissiveMap: scoreTex }),
        )
        scoreboard.position.set(0, 18, 0)
        scoreboard.rotation.y = Math.PI
        scene.add(scoreboard)
      }

      // Phase 16.39 — Basketball ball + NBA2K-style jump shot for gym + blacktop.
      // Mirrors the city basketball mechanic at line ~631 but routes every shot
      // through findNearestHoop() so full-court gym (2 hoops) auto-targets the
      // closest one based on player position. Scoring checks ALL hoops on the
      // floor so dunks/threes at either end count.
      const ballMatBG = new THREE.MeshStandardMaterial({
        color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.1, roughness: 0.6, metalness: 0.05,
      })
      const ballBG = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ballMatBG)
      ballBG.castShadow = true
      ballBG.position.set(0, 1.4, 0)
      scene.add(ballBG)
      const lastTargetBG = new THREE.Vector3()
      if (hoopList[0]) lastTargetBG.copy(hoopList[0].rimPos)
      const ballStateBG = {
        held: true,
        vel: new THREE.Vector3(),
        scoredThisShot: false,
        airborneFrames: 0,
        returnTimer: 0,
      }
      ;(scene.userData as any).ball = { ball: ballBG, ballState: ballStateBG, RIM_POS: lastTargetBG }

      // Phase 16.74 — BALL TRAIL. Comet trail visualizes shot arc while
      // ball is airborne. 16-segment InstancedMesh of small spheres; each
      // frame the head writes ball position, oldest fades out. Cheap
      // (one mesh, one matrix update per frame).
      const TRAIL_LEN = 16
      const trailGeom = new THREE.SphereGeometry(0.06, 8, 6)
      const trailMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.6, depthWrite: false })
      const ballTrail = new THREE.InstancedMesh(trailGeom, trailMat, TRAIL_LEN)
      ballTrail.frustumCulled = false
      // Initialize all instances offscreen
      const _trailMat = new THREE.Matrix4()
      _trailMat.makeTranslation(0, -100, 0)
      for (let i = 0; i < TRAIL_LEN; i++) ballTrail.setMatrixAt(i, _trailMat)
      ballTrail.instanceMatrix.needsUpdate = true
      scene.add(ballTrail)
      const trailPositions: THREE.Vector3[] = []
      for (let i = 0; i < TRAIL_LEN; i++) trailPositions.push(new THREE.Vector3(0, -100, 0))
      let trailWriteIndex = 0
      ;(scene.userData as any).ballTrail = {
        mesh: ballTrail,
        writeIndex: () => trailWriteIndex,
        push: (pos: THREE.Vector3) => {
          trailPositions[trailWriteIndex].copy(pos)
          trailWriteIndex = (trailWriteIndex + 1) % TRAIL_LEN
        },
        update: () => {
          const m = new THREE.Matrix4()
          const fadeScale = new THREE.Vector3()
          for (let i = 0; i < TRAIL_LEN; i++) {
            // Compute age: head is newest, tail oldest
            const age = (TRAIL_LEN + trailWriteIndex - i - 1) % TRAIL_LEN
            const t = age / (TRAIL_LEN - 1)
            const s = (1 - t) * 0.9 + 0.1
            fadeScale.set(s, s, s)
            m.compose(trailPositions[i], new THREE.Quaternion(), fadeScale)
            ballTrail.setMatrixAt(i, m)
          }
          ballTrail.instanceMatrix.needsUpdate = true
        },
        reset: () => {
          for (let i = 0; i < TRAIL_LEN; i++) trailPositions[i].set(0, -100, 0)
          trailWriteIndex = 0
        },
      }

      const jumpStateBG = { active: false, t: 0, duration: 0, peakY: 0, ballRelease: 0, isDunk: false, baseY: 0 }
      ;(scene.userData as any).jumpState = jumpStateBG

      const findNearestHoop = (pos: THREE.Vector3): THREE.Vector3 => {
        if (hoopList.length === 0) return new THREE.Vector3(0, 3.3, 0)
        let nearest = hoopList[0].rimPos
        let minDist = pos.distanceTo(nearest)
        for (let i = 1; i < hoopList.length; i++) {
          const d = pos.distanceTo(hoopList[i].rimPos)
          if (d < minDist) { minDist = d; nearest = hoopList[i].rimPos }
        }
        return nearest
      }

      shootRef.current = () => {
        if (!ballStateBG.held || jumpStateBG.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        const start = ballBG.position.clone()
        const target = findNearestHoop(playerGroup.position).clone()
        lastTargetBG.copy(target)
        const dx = target.x - start.x
        const dz = target.z - start.z
        const horizDist = Math.hypot(dx, dz)
        if (horizDist < 0.1) return
        playerGroup.rotation.y = Math.atan2(dx, dz)
        const isDunk = horizDist < 2.5
        const isLayup = !isDunk && horizDist < 4.0
        const isThree = horizDist > 7
        const wantFadeaway = !!(keys && (keys['shift'] || keys['f']))
        // Phase 16.55 — defender contests shots. If defender is within 2u
        // of shooter, jitter the target so the shot is less accurate.
        // Within 1.2u (right on top), 30% chance to BLOCK outright.
        const defRef = (scene.userData as any).defender
        let blocked = false
        if (defRef?.group) {
          const ddx = playerGroup.position.x - defRef.group.position.x
          const ddz = playerGroup.position.z - defRef.group.position.z
          const defDist = Math.hypot(ddx, ddz)
          const diff = getDiff()
          if (defDist < diff.blockRange && Math.random() < diff.blockChance) {
            blocked = true
            speak("DENIED!", { pitch: 0.92, rate: 1.2 })
            triggerCameraShake(0.2, 0.2)
            const crowdRef2 = (scene.userData as any).crowd
            if (crowdRef2?.cheer) crowdRef2.cheer()
          } else if (defDist < diff.contestRange) {
            // Contested — jitter target by random offset
            const jitter = (diff.contestRange - defDist) * 0.5
            target.x += (Math.random() - 0.5) * jitter
            target.z += (Math.random() - 0.5) * jitter
            target.y -= Math.random() * 0.3
          }
        }
        if (blocked) {
          // Ball pops up out of player's hand + falls straight down
          ballStateBG.held = false
          ballStateBG.vel.set(0, 5, 0)
          ;(ballStateBG as any).shotType = 'blocked'
          setHoopScore((s) => ({ ...s, attempts: s.attempts + 1, streak: 0 }))
          setDefenderBlocks((b) => b + 1)
          triggerBigPlay('REJECTED!', '#ef4444', '🚫')
          return
        }
        jumpStateBG.active = true
        jumpStateBG.t = 0
        jumpStateBG.baseY = playerGroup.position.y
        // Phase 16.60 / 16.72 — Park-court power dunk. Big airtime, big
        // leap, big hangtime. Player rises 3.5u (was 1.8u) and stays
        // airborne 0.95s so the dunk reads as a real flight, not a hop.
        // (Phrasing kept generic to streetball — no NBA player references.)
        jumpStateBG.duration = isDunk ? 0.95 : isLayup ? 0.7 : isThree ? 0.5 : 0.55
        jumpStateBG.peakY = isDunk ? 3.5 : isLayup ? 1.0 : isThree ? 0.6 : 1.2
        jumpStateBG.ballRelease = isDunk ? 0.55 : isLayup ? 0.55 : 0.35
        jumpStateBG.isDunk = isDunk
        ;(jumpStateBG as any).pendingShot = { start, target, dx, dz, horizDist, isDunk, isThree, isLayup, isFadeaway: wantFadeaway }
        // Phase 16.53 — every shot starts game clocks + resets shot clock
        clocksRunningRef.current = true
        shotClockRef.current = 24
        // Phase 16.70 — shot meter starts NOW, ends at release frame
        const _meterStart = performance.now()
        const _meterDur = jumpStateBG.duration * jumpStateBG.ballRelease * 1000
        shotMeterRef.current = { startMs: _meterStart, durationMs: _meterDur }
        setShotMeter({ active: true, progress: 0, quality: 'early' })
        // Phase 16.41 — play the matching XBot body clip (durations match
        // jumpStateBG.duration so the body anim and the trajectory line up;
        // dunk = 950ms hangtime now matches Mixamo Jump clip cleanly)
        const xb = (avatarHolder.userData as any).xbot
        if (xb?.play) {
          if (isDunk) xb.play('dunk', 950)
          else if (isLayup) xb.play('layup', 700)
          else if (wantFadeaway) xb.play('fadeaway', 1000)
          else xb.play('jumpshot', 800)
        }
      }

      ;(scene.userData as any).updateJump = (dt: number) => {
        if (!jumpStateBG.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        jumpStateBG.t += dt
        const progress = jumpStateBG.t / jumpStateBG.duration
        let jumpY = 0
        if (progress < 0.15) {
          jumpY = -0.1 * (progress / 0.15)
        } else if (progress < 1) {
          const u = (progress - 0.15) / 0.85
          jumpY = jumpStateBG.peakY * 4 * u * (1 - u) - 0.1 + 0.1 * u
        }
        playerGroup.position.y = jumpStateBG.baseY + jumpY
        const shot = (jumpStateBG as any).pendingShot
        if (shot && progress >= jumpStateBG.ballRelease) {
          const { target, isDunk, isThree } = shot
          if (isDunk) {
            ballBG.position.set(target.x, target.y + 0.5, target.z)
            ballStateBG.vel.set(0, -8, 0)
          } else {
            // Phase 16.65 — release ball from a HAND-equivalent point
            // relative to the player's CURRENT position + facing direction.
            // Previously used `start` captured at shoot-press time, which
            // was wherever the dribble cycle left the ball (could be at
            // floor Y or behind the player after a turn). Now: player is
            // facing the hoop (rotation.y was set at shoot-press), and we
            // release from in-front-of and above the player so the ball
            // visibly comes out of the upper body area regardless of body
            // anim state. Recompute dx/dz against the new release point.
            const fwd = playerGroup.rotation.y
            const releaseX = playerGroup.position.x + Math.sin(fwd) * 0.32
            const releaseZ = playerGroup.position.z + Math.cos(fwd) * 0.32
            const releaseY = jumpStateBG.baseY + jumpStateBG.peakY + 1.7
            ballBG.position.set(releaseX, releaseY, releaseZ)
            const rdx = target.x - releaseX
            const rdz = target.z - releaseZ
            const apexY = target.y + (isThree ? 3.5 : 2.0)
            const g = 9.8 * 1.5
            const timeUp = isThree ? 0.45 : 0.4
            const timeDown = isThree ? 0.7 : 0.55
            const vy = (apexY - releaseY) / timeUp + 0.5 * g * timeUp
            const totalTime = timeUp + timeDown
            const vx = rdx / totalTime
            const vz = rdz / totalTime
            ballStateBG.vel.set(vx, vy, vz)
          }
          ballStateBG.held = false
          ballStateBG.scoredThisShot = false
          ballStateBG.airborneFrames = 0
          ;(ballStateBG as any).rimHitThisShot = false
          ;(ballStateBG as any).bbHitThisShot = false
          ;(ballStateBG as any).airTime = 0
          ;(ballStateBG as any).bounces = 0
          ballStateBG.returnTimer = 0
          // Phase 16.58 — track attempt by shot type
          {
            const _t = (jumpStateBG as any).isDunk ? 'dunk' :
              ((shot as any).isThree ? 'three' :
              ((shot as any).horizDist < 4 ? 'layup' :
              ((shot as any).isFadeaway ? 'fadeaway' : 'jumpshot')))
            recordAttempt(_t)
          }
          // Phase 16.51 — stash shot type so the score/miss detect path can
          // dispatch the right play-by-play call
          const _isDunk = (jumpStateBG as any).isDunk
          const _isThree = (shot as any).isThree
          const _horizDist = (shot as any).horizDist || 0
          ;(ballStateBG as any).shotType = _isDunk ? 'dunk' :
            _isThree ? 'three' :
            (_horizDist < 4 ? 'layup' :
            ((shot as any).isFadeaway ? 'fadeaway' : 'jumpshot'))
          ;(ballStateBG as any).shotOriginX = (shot as any).start?.x ?? 0
          ;(ballStateBG as any).shotOriginZ = (shot as any).start?.z ?? 0
          setHoopScore((s) => ({ ...s, attempts: s.attempts + 1 }))
          ;(jumpStateBG as any).pendingShot = null
        }
        if (jumpStateBG.t >= jumpStateBG.duration) {
          jumpStateBG.active = false
          playerGroup.position.y = jumpStateBG.baseY
        }
      }

      ;(scene.userData as any).gravity = (g: number) => {
        if (ballStateBG.held) return
        ballStateBG.airborneFrames++
        const prevY = ballBG.position.y
        const prevVelY = ballStateBG.vel.y
        ballStateBG.vel.y -= 9.8 * 1.5 * g
        ballBG.position.x += ballStateBG.vel.x * g
        ballBG.position.y += ballStateBG.vel.y * g
        ballBG.position.z += ballStateBG.vel.z * g
        // Phase 16.43 — BACKSPIN during flight. Real shooters put backspin
        // on the ball; rotation axis is perpendicular to the direction of
        // horizontal travel. Spin rate scales with launch speed so a hard
        // shot reads as fast spin and a soft layup spins gently.
        const horizVel = Math.hypot(ballStateBG.vel.x, ballStateBG.vel.z)
        if (horizVel > 0.05) {
          const spinRate = (horizVel * 0.45 + Math.abs(ballStateBG.vel.y) * 0.05) * g
          // Spin around axis perpendicular to horizontal velocity in XZ plane
          const ax = -ballStateBG.vel.z / horizVel
          const az = ballStateBG.vel.x / horizVel
          ballBG.rotation.x += ax * spinRate
          ballBG.rotation.z += az * spinRate
        } else {
          // Free-fall ball gets gentle tumble so it doesn't look static
          ballBG.rotation.x += 2.0 * g
        }
        // Sound detection: SWISH on score, RIM on near-miss, BACKBOARD on plane hit
        if (!ballStateBG.scoredThisShot && ballStateBG.vel.y < 0) {
          for (const hoop of hoopList) {
            const dxh = ballBG.position.x - hoop.rimPos.x
            const dzh = ballBG.position.z - hoop.rimPos.z
            const horizDist = Math.hypot(dxh, dzh)
            const dyh = Math.abs(ballBG.position.y - hoop.rimPos.y)
            if (horizDist < 0.225 && dyh < 0.15) {  // NBA rim radius 0.225m, dy tighter for cleaner swish
              ballStateBG.scoredThisShot = true
              // Phase 16.74 — green rim flash on score
              flashRim(hoop.rimMat, 0x22c55e, 3.0, 700)
              // Phase 16.57 — score side depends on who shot the ball
              const ballOwner = (ballStateBG as any).owner || 'player'
              const shotTypeForPoints = (ballStateBG as any).shotType || 'jumpshot'
              const pts = shotTypeForPoints === 'three' ? 3 : 2
              if (ballOwner === 'defender') {
                setPointScore((ps) => {
                  const newDef = ps.defender + pts
                  if (newDef >= POINTS_TO_WIN && !gameOver) {
                    setGameOver('defender')
                    playBuzzer()
                    speak("GAME! DEFENDER WINS!", { pitch: 0.92, rate: 1.15 })
                  }
                  return { ...ps, defender: newDef }
                })
                speak(["DEFENDER SCORES!", "BUCKET FOR THE OPPONENT!"][Math.floor(Math.random()*2)], { pitch: 0.95, rate: 1.18 })
                playSwish()
                // Phase 16.75 — INBOUND PAUSE after defender make. Ball
                // returns to player, both characters reset to half-court
                // start positions, 1.5s freeze with CHECK BALL banner.
                ;(ballStateBG as any).owner = 'player'
                inboundUntilRef.current = performance.now() + 1500
                setInboundActive(true)
                setTimeout(() => {
                  setInboundActive(false)
                  // Reposition characters to half-court start
                  const pg = (scene.userData as any).playerGroupRef
                  const dsRef = (scene.userData as any).defender
                  if (pg) pg.position.set(0, 0, 4)
                  if (dsRef?.group) dsRef.group.position.set(0, 0, -4)
                  // Reset ball to player + reset shot clock
                  ballStateBG.held = true
                  ballStateBG.vel.set(0, 0, 0)
                  shotClockRef.current = 24
                  setShotClock(24)
                  if (dsRef) { dsRef.mode = 'guard'; dsRef.shootTimer = 0 }
                }, 1500)
                break
              }
              // Phase 16.56 — player POINTS: 3pt for three, 2pt for everything else
              setPointScore((ps) => {
                const newPlayer = ps.player + pts
                if (newPlayer >= POINTS_TO_WIN && !gameOver) {
                  setGameOver('player')
                  playBuzzer()
                  speak("GAME! YOU WIN!", { pitch: 1.05, rate: 1.15 })
                }
                return { ...ps, player: newPlayer }
              })
              setHoopScore((s) => {
                const nextStreak = s.streak + 1
                // Phase 16.51 — play-by-play announcer fires inside the
                // setState callback so we have the FRESH streak value.
                const shotType = (ballStateBG as any).shotType || 'jumpshot'
                announceMake(shotType, nextStreak)
                // Phase 16.51 — score popup + camera shake on big plays
                spawnScorePopup({
                  text: shotType === 'three' ? '+3' : shotType === 'dunk' ? 'SLAM!' : '+2',
                  worldX: (ballStateBG as any).shotOriginX ?? 0,
                  worldY: 2.5,
                  worldZ: (ballStateBG as any).shotOriginZ ?? 0,
                  color: shotType === 'dunk' ? '#fb923c' : shotType === 'three' ? '#facc15' : '#22c55e',
                })
                if (shotType === 'dunk') triggerCameraShake(0.75, 0.5)  // Phase 16.60 — gorilla-dunk earthshake
                else if (nextStreak >= 3) triggerCameraShake(0.18, 0.2)
                // Phase 16.52 — hot zone register
                registerMakeAt(
                  (ballStateBG as any).shotOriginX ?? 0,
                  (ballStateBG as any).shotOriginZ ?? 0,
                )
                // Phase 16.58 — record make stats + Big Play Cam
                recordMake(shotType)
                if (shotType === 'dunk') {
                  const dunkBanners = ['POSTER!', 'ON \'EM!', 'PARK LEGEND!', 'TOO STRONG!']
                  triggerBigPlay(dunkBanners[Math.floor(Math.random() * dunkBanners.length)], '#fb923c', '💥')
                  // Phase 16.71 — DJ drops new track after a poster
                  const _a2 = arenaAudioRef.current
                  if (_a2) { try { _a2.dispatchEvent(new Event('ended')) } catch {} }
                } else if (nextStreak === 5) {
                  triggerBigPlay('HOT HAND!', '#ef4444', '🔥')
                } else if (nextStreak === 7) {
                  triggerBigPlay('COLD-BLOODED!', '#dc2626', '👑')
                } else if (shotType === 'three' && (ballStateBG as any).shotOriginZ !== undefined) {
                  const sx = (ballStateBG as any).shotOriginX ?? 0
                  const sz = (ballStateBG as any).shotOriginZ ?? 0
                  if (Math.hypot(sx, sz) > 10) {  // Half-court range
                    triggerBigPlay('FROM DEEP!', '#facc15', '🎯')
                  }
                }
                return { makes: s.makes + 1, attempts: s.attempts, streak: nextStreak }
              })
              playSwish()
              // Phase 16.44 — crowd erupts on every make
              const crowdRef = (scene.userData as any).crowd
              if (crowdRef?.cheer) crowdRef.cheer()
              // Phase 16.47 — broadcast score to remote peer so their crowd
              // cheers too. Sent on reliable event channel.
              const mpPeer = peerRef.current
              if (mpPeer) {
                try { mpPeer.sendEvent({ type: 'score', player: 'me' }) } catch {}
              }
              // Phase 16.75 — INBOUND PAUSE after PLAYER make. Reposition
              // both characters to half-court + reset ball to defender
              // (loser-out rules — opponent inbounds after your make).
              inboundUntilRef.current = performance.now() + 1500
              setInboundActive(true)
              setTimeout(() => {
                setInboundActive(false)
                const pg = (scene.userData as any).playerGroupRef
                const dsRef = (scene.userData as any).defender
                if (pg) pg.position.set(0, 0, 4)
                if (dsRef?.group) dsRef.group.position.set(0, 0, -4)
                ballStateBG.held = true
                ballStateBG.vel.set(0, 0, 0)
                ;(ballStateBG as any).owner = 'player'  // street rule: scorer keeps ball
                shotClockRef.current = 24
                setShotClock(24)
                if (dsRef) { dsRef.mode = 'guard'; dsRef.shootTimer = 0 }
              }, 1500)
              break
            }
            // Phase 16.65 — REAL rim ring bounce (NOT just SFX). Reflects
            // velocity radially outward off the rim torus (outer radius
            // 0.42) so off-target shots ACTUALLY bounce off the metal
            // instead of ghosting through.
            if (!ballStateBG.scoredThisShot && horizDist > 0.225 && horizDist < 0.42 && dyh < 0.15) {
              const rimCD = ((ballStateBG as any).rimBounceCooldown || 0)
              if (rimCD <= 0) {
                ;(ballStateBG as any).rimBounceCooldown = 0.15
                const nx = dxh / (horizDist || 1)
                const nz = dzh / (horizDist || 1)
                const vDotN = ballStateBG.vel.x * nx + ballStateBG.vel.z * nz
                if (vDotN < 0) {
                  // Reflect horizontal component off rim normal, dampen
                  ballStateBG.vel.x -= 2 * vDotN * nx * 0.5
                  ballStateBG.vel.z -= 2 * vDotN * nz * 0.5
                  ballStateBG.vel.x *= 0.55
                  ballStateBG.vel.z *= 0.55
                  ballStateBG.vel.y *= 0.6
                  // Nudge ball outside ring so it doesn't re-collide
                  ballBG.position.x = hoop.rimPos.x + nx * 0.55
                  ballBG.position.z = hoop.rimPos.z + nz * 0.55
                }
                if (!(ballStateBG as any).rimHitThisShot) {
                  ;(ballStateBG as any).rimHitThisShot = true
                  playRim()
                  // Phase 16.74 — red rim flash on clank
                  flashRim(hoop.rimMat, 0xef4444, 2.5, 400)
                }
              }
            }
            // Phase 16.65 — REAL backboard bounce. The board sits 0.4u
            // FURTHER from the court center than the rim, in the same
            // sign direction as the baseline. So for the +z hoop board
            // is at rimZ + 0.4, for the -z hoop board is at rimZ - 0.4.
            // boardNormalZ points back toward the court center (opposite
            // sign from the baseline offset). Ball must be travelling
            // INTO the board (vel.z opposite of boardNormalZ).
            const boardSign = Math.sign(hoop.rimPos.z) || 1
            const boardZ = hoop.rimPos.z + 0.4 * boardSign
            const boardNormalZ = -boardSign
            if (Math.abs(ballBG.position.z - boardZ) < 0.18 &&
                Math.abs(ballBG.position.x - hoop.rimPos.x) < 1.0 &&
                ballBG.position.y > 3.2 && ballBG.position.y < 4.45) {
              const bbCD = ((ballStateBG as any).bbBounceCooldown || 0)
              if (bbCD <= 0 && (ballStateBG.vel.z * boardNormalZ) < 0) {
                ;(ballStateBG as any).bbBounceCooldown = 0.18
                ballStateBG.vel.z = -ballStateBG.vel.z * 0.7
                ballStateBG.vel.x *= 0.85
                ballStateBG.vel.y *= 0.92
                // Push ball off the board face toward the court
                ballBG.position.z = boardZ + boardNormalZ * 0.18
                if (!(ballStateBG as any).bbHitThisShot) {
                  ;(ballStateBG as any).bbHitThisShot = true
                  playBackboard()
                }
              }
            }
          }
        }
        // Phase 16.65 — bounce-cooldown countdown so successive rim/board
        // contacts in the same flight don't infinite-loop the reflection.
        if ((ballStateBG as any).rimBounceCooldown > 0) {
          ;(ballStateBG as any).rimBounceCooldown -= g
        }
        if ((ballStateBG as any).bbBounceCooldown > 0) {
          ;(ballStateBG as any).bbBounceCooldown -= g
        }
        // Track bounces — after 2 floor contacts force settle so the bounce
        // loop can't keep ball "alive" with vel.y < -2 forever.
        if (ballBG.position.y < 0.18) {
          ballBG.position.y = 0.18
          ;(ballStateBG as any).bounces = ((ballStateBG as any).bounces || 0) + 1
          if (ballStateBG.vel.y < -2 && (ballStateBG as any).bounces < 2) {
            ballStateBG.vel.y = -ballStateBG.vel.y * 0.4
            ballStateBG.vel.x *= 0.55
            ballStateBG.vel.z *= 0.55
          } else {
            ballStateBG.vel.set(0, 0, 0)
            if (ballStateBG.returnTimer <= 0) ballStateBG.returnTimer = 0.6
          }
          if (!ballStateBG.scoredThisShot && ballStateBG.airborneFrames > 5) {
            setHoopScore((s) => ({ ...s, streak: 0 }))
            ballStateBG.scoredThisShot = true
            // Phase 16.51 — occasional miss commentary
            announceMiss((ballStateBG as any).shotType || 'jumpshot')
            // Phase 16.57 — defender rebound on player miss
            const wasPlayerShot = ((ballStateBG as any).owner || 'player') === 'player'
            const defGrp = (scene.userData as any).defender?.group
            if (wasPlayerShot && defGrp) {
              const rdx = ballBG.position.x - defGrp.position.x
              const rdz = ballBG.position.z - defGrp.position.z
              if (Math.hypot(rdx, rdz) < 3.5) {
                // Defender picks up
                ;(ballStateBG as any).owner = 'defender'
                ballStateBG.held = true
                ballStateBG.vel.set(0, 0, 0)
                ballStateBG.returnTimer = 0
                ;(ballStateBG as any).airTime = 0
                ;(ballStateBG as any).bounces = 0
                const ds = (scene.userData as any).defender
                if (ds) { ds.mode = 'drive'; ds.shootTimer = getDiff().shootTimer }
                speak(["REBOUND DEFENSE!", "BOARDS!", "DEF GRABS IT!"][Math.floor(Math.random()*3)], { pitch: 0.95, rate: 1.15 })
                // Phase 16.71 — classic DEFENSE chant + duck arena music
                setTimeout(() => playDefenseChant(), 600)
                const _a = arenaAudioRef.current
                if (_a) { const v = _a.volume; _a.volume = 0.10; setTimeout(() => { if (_a) _a.volume = v }, 2800) }
              }
            }
          }
        }
        // Phase 16.39 — HARD watchdog. Every shot returns within 2.5s no
        // matter what state the ball is in (over the fence, wedged on the
        // backboard top, bouncing endlessly). Player never gets stuck.
        ;(ballStateBG as any).airTime = ((ballStateBG as any).airTime || 0) + g
        const courtBound = theme === 'gym' ? 16 : 10
        const outOfBounds = Math.abs(ballBG.position.x) > courtBound ||
                            Math.abs(ballBG.position.z) > courtBound ||
                            ballBG.position.y > 25
        if (outOfBounds && ballStateBG.returnTimer <= 0) {
          ballStateBG.returnTimer = 0.3
        }
        if ((ballStateBG as any).airTime > 2.5 && ballStateBG.returnTimer <= 0) {
          ballStateBG.returnTimer = 0.05
        }
        if (ballStateBG.returnTimer > 0) {
          ballStateBG.returnTimer -= g
          if (ballStateBG.returnTimer <= 0) {
            ballStateBG.held = true
            ballStateBG.vel.set(0, 0, 0)
            ;(ballStateBG as any).airTime = 0
            ;(ballStateBG as any).bounces = 0
            ;(ballStateBG as any).rimHitThisShot = false
            ;(ballStateBG as any).bbHitThisShot = false
            // Phase 16.57 — possession reverts to player after any return
            // (street rules: loser-of-possession or defender miss → player)
            ;(ballStateBG as any).owner = 'player'
            const ds = (scene.userData as any).defender
            if (ds) { ds.mode = 'guard'; ds.shootTimer = 0 }
          }
        }
      }
    }

    if (theme === 'city') {
      // Phase 16.25 — Dashed center line extended to FULL CITY LENGTH (95u
      // each direction) so the street stretches across the open world.
      for (let i = -94; i <= 94; i += 3) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.15 })
        )
        dash.rotation.x = -Math.PI / 2
        dash.position.set(0, 0.01, i)
        scene.add(dash)
      }
      // CROSS STREETS — perpendicular dashed lines every 40u to break up the
      // grid into city blocks and give intersections to walk through.
      for (let cx = -80; cx <= 80; cx += 40) {
        for (let i = -90; i <= 90; i += 3) {
          if (Math.abs(i) < 5) continue  // gap at center intersection
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(1.8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.15 })
          )
          dash.rotation.x = -Math.PI / 2
          dash.position.set(i, 0.01, cx)
          scene.add(dash)
        }
      }
      // Sidewalk strips — full length, both sides
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 })
      ;[-16.5, 16.5].forEach((x) => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 200), sidewalkMat)
        sw.position.set(x, 0.075, 0)
        sw.receiveShadow = true
        scene.add(sw)
      })
      // Cross-street sidewalks
      for (let cx = -80; cx <= 80; cx += 40) {
        ;[-16.5, 16.5].forEach((z) => {
          const sw = new THREE.Mesh(new THREE.BoxGeometry(200, 0.15, 2.5), sidewalkMat)
          sw.position.set(0, 0.075, cx + (z > 0 ? -16.5 : 16.5))
          scene.add(sw)
        })
      }
      // Procedural brick texture for the storefront walls
      const brickCanvas = document.createElement('canvas')
      brickCanvas.width = 256; brickCanvas.height = 256
      const bctx = brickCanvas.getContext('2d')!
      bctx.fillStyle = '#5a3a30'; bctx.fillRect(0, 0, 256, 256)
      bctx.strokeStyle = '#2a1810'; bctx.lineWidth = 2
      const brickH = 16
      const brickW = 36
      for (let row = 0; row < 256 / brickH; row++) {
        const xOff = (row % 2 === 0) ? 0 : brickW / 2
        for (let col = -1; col <= 256 / brickW; col++) {
          const x = col * brickW + xOff
          const y = row * brickH
          bctx.strokeRect(x, y, brickW, brickH)
          // mortar shading
          bctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`
          bctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2)
        }
      }
      const brickTex = new THREE.CanvasTexture(brickCanvas)
      brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping
      brickTex.repeat.set(8, 2)
      const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85, metalness: 0.05 })
      // Storefront facades extended to full street length (200u)
      ;[
        { x: -19.0, rot: Math.PI / 2 },
        { x: 19.0, rot: -Math.PI / 2 },
      ].forEach(({ x, rot }) => {
        const facade = new THREE.Mesh(new THREE.PlaneGeometry(200, 8), brickMat)
        facade.position.set(x, 4, 0)
        facade.rotation.y = rot
        scene.add(facade)
      })
      // Storefront awnings — bright colored stripes along the FULL street
      // (was 6 awnings 0-40u; now 30 awnings spanning -90 to +90u)
      const awningColors = [0xdc2626, 0x16a34a, 0x2563eb, 0xfacc15, 0xa855f7]
      for (let i = 0; i < 30; i++) {
        const ax = -94 + i * 6.5
        const acol = awningColors[i % awningColors.length]
        const aMat = new THREE.MeshStandardMaterial({ color: acol, emissive: acol, emissiveIntensity: 0.1, roughness: 0.5 })
        ;[-18.5, 18.5].forEach((wx) => {
          const awning = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.5), aMat)
          awning.position.set(wx + (wx < 0 ? 1 : -1), 3.5, ax)
          awning.castShadow = true
          scene.add(awning)
          // Storefront door (dark rectangle below awning)
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3, emissive: 0xfacc15, emissiveIntensity: 0.05 })
          const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.5), doorMat)
          door.position.set(wx + (wx < 0 ? 0.05 : -0.05), 1.5, ax)
          door.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2
          scene.add(door)
          // Storefront window beside the door
          const winMat = new THREE.MeshStandardMaterial({ color: 0x88aabb, transparent: true, opacity: 0.45, metalness: 0.9, roughness: 0.1, emissive: 0xfacc15, emissiveIntensity: 0.08 })
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), winMat)
          win.position.set(wx + (wx < 0 ? 0.05 : -0.05), 1.8, ax + 1.6)
          win.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2
          scene.add(win)
        })
      }
      // Phase 16.14 — BASKETBALL HALF-COURT at the far end of the street.
      // Painted asphalt + boundary lines + free-throw + three-point arc + hoop.
      // No physics yet (Phase 16.15) but it's a real visual landmark to walk
      // up to. Frank's vision: stumble across it during a gallery walk, see
      // the hoop, eventually pick up a game.
      const courtZ = -17  // back of street
      // Court boundary paint (cyan-grey concrete)
      const courtMat = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.95 })
      const court = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), courtMat)
      court.rotation.x = -Math.PI / 2
      court.position.set(0, 0.02, courtZ)
      court.receiveShadow = true
      scene.add(court)
      // White boundary lines (4 thin rectangles framing the court)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const mkLine = (w: number, h: number, x: number, z: number) => {
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat)
        ln.rotation.x = -Math.PI / 2
        ln.position.set(x, 0.03, z)
        scene.add(ln)
      }
      mkLine(10, 0.08, 0, courtZ - 3)  // top
      mkLine(10, 0.08, 0, courtZ + 3)  // bottom
      mkLine(0.08, 6, -5, courtZ)      // left
      mkLine(0.08, 6, 5, courtZ)       // right
      // Free-throw line + key paint
      mkLine(4, 0.08, 0, courtZ - 0.5)
      const keyPaint = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 3),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.4 }),
      )
      keyPaint.rotation.x = -Math.PI / 2
      keyPaint.position.set(0, 0.025, courtZ - 1.8)
      scene.add(keyPaint)
      // Three-point arc (segmented line)
      for (let a = -Math.PI * 0.4; a <= Math.PI * 0.4; a += 0.05) {
        const r = 4
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.08), lineMat)
        seg.rotation.x = -Math.PI / 2
        seg.rotation.z = a + Math.PI / 2
        seg.position.set(Math.sin(a) * r, 0.03, courtZ - 2.8 - Math.cos(a) * r)
        scene.add(seg)
      }
      // Hoop pole + backboard + rim
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 }),
      )
      pole.position.set(0, 2, courtZ - 3.5)
      pole.castShadow = true
      scene.add(pole)
      const backboard = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
      )
      backboard.position.set(0, 3.8, courtZ - 3.4)
      backboard.castShadow = true
      scene.add(backboard)
      // Backboard square (target box)
      const targetBox = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0 }),
      )
      ;[
        [-0.3, 3.6], [0.3, 3.6], [-0.3, 4.05], [0.3, 4.05],
      ].forEach(() => {})
      // Just draw target square outline
      const sqOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.6, 0.45)),
        new THREE.LineBasicMaterial({ color: 0xdc2626 }),
      )
      sqOutline.position.set(0, 3.7, courtZ - 3.35)
      scene.add(sqOutline)
      // Rim (orange ring)
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.04, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3 }),
      )
      rim.position.set(0, 3.3, courtZ - 3.0)
      rim.rotation.x = Math.PI / 2
      rim.castShadow = true
      scene.add(rim)
      // Net (10 small cylinders hanging from rim — visual approximation)
      const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      for (let ni = 0; ni < 12; ni++) {
        const a = (ni / 12) * Math.PI * 2
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), netMat)
        seg.position.set(Math.cos(a) * 0.32, 3.13, courtZ - 3.0 + Math.sin(a) * 0.32)
        scene.add(seg)
      }
      // Court signage above the court — yellow "WELCOME TO THE COURT"
      const signCanvas = document.createElement('canvas')
      signCanvas.width = 1024; signCanvas.height = 128
      const sctx = signCanvas.getContext('2d')!
      sctx.fillStyle = '#000'; sctx.fillRect(0, 0, 1024, 128)
      sctx.strokeStyle = '#facc15'; sctx.lineWidth = 4; sctx.strokeRect(8, 8, 1008, 112)
      sctx.fillStyle = '#facc15'; sctx.font = 'bold 64px monospace'; sctx.textAlign = 'center'
      sctx.fillText('🏀 THE COURT', 512, 80)
      const signTex = new THREE.CanvasTexture(signCanvas)
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 0.75),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xfacc15, emissiveIntensity: 0.3, emissiveMap: signTex }),
      )
      sign.position.set(0, 5.0, courtZ - 3.6)
      scene.add(sign)

      // Phase 16.27 — BASKETBALL. Orange ball follows the character at hand
      // height; press B (or tap SHOOT button) to launch it toward the hoop
      // with a parabolic arc. Simple physics — gravity + initial velocity
      // aimed at the rim's apex. Detect score by checking ball passes through
      // the rim's 0.35u torus radius near rim Y on the way down.
      const RIM_POS = new THREE.Vector3(0, 3.3, courtZ - 3.0)
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 0.1, roughness: 0.6, metalness: 0.05,
      })
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), ballMat)
      ball.castShadow = true
      ball.position.set(0, 1.4, 5)  // initial spawn at player
      scene.add(ball)
      const ballState = {
        held: true,
        vel: new THREE.Vector3(),
        scoredThisShot: false,
        airborneFrames: 0,
        returnTimer: 0,
      }
      ;(scene.userData as any).ball = { ball, ballState, RIM_POS }

      // Phase 16.35 — NBA2K-style shot mechanic with jump animation and
      // automatic slam dunk when close to rim. Player crouches → leaps →
      // ball releases at apex. Distance from rim determines shot type:
      //   <2.5u → SLAM DUNK (vertical leap, ball pushed straight through)
      //   2.5-7u → JUMP SHOT (arc with player jump)
      //   >7u → THREE-POINTER (longer arc, less jump)
      const jumpState = { active: false, t: 0, duration: 0, peakY: 0, ballRelease: 0, isDunk: false, baseY: 0 }
      ;(scene.userData as any).jumpState = jumpState
      // playerGroup is declared further below — store ref lazily via scene.userData

      shootRef.current = () => {
        if (!ballState.held || jumpState.active) return  // can't shoot while mid-jump
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        const start = ball.position.clone()
        const target = RIM_POS.clone()
        const dx = target.x - start.x
        const dz = target.z - start.z
        const horizDist = Math.hypot(dx, dz)
        if (horizDist < 0.1) return

        // Face the hoop (rotate player to look at it)
        playerGroup.rotation.y = Math.atan2(dx, dz)

        const isDunk = horizDist < 2.5
        const isThree = horizDist > 7

        // Jump animation parameters
        jumpState.active = true
        jumpState.t = 0
        jumpState.baseY = playerGroup.position.y
        jumpState.duration = isDunk ? 0.6 : isThree ? 0.5 : 0.55
        jumpState.peakY = isDunk ? 1.8 : isThree ? 0.6 : 1.2  // dunk = highest jump
        jumpState.ballRelease = isDunk ? 0.5 : 0.35  // release at peak of jump for dunk
        jumpState.isDunk = isDunk

        // Pre-set ball trajectory parameters but only release at peak of jump
        ;(jumpState as any).pendingShot = { start, target, dx, dz, horizDist, isDunk, isThree }
      }
      ;(scene.userData as any).updateJump = (dt: number) => {
        if (!jumpState.active) return
        const playerGroup = (scene.userData as any).playerGroupRef
        if (!playerGroup) return
        jumpState.t += dt
        const progress = jumpState.t / jumpState.duration
        // Squat-jump-land curve: smooth parabola for vertical leap
        let jumpY = 0
        if (progress < 0.15) {
          // Squat: dip slightly
          jumpY = -0.1 * (progress / 0.15)
        } else if (progress < 1) {
          // Jump arc — parabola peaking at jumpState.peakY
          const u = (progress - 0.15) / 0.85
          jumpY = jumpState.peakY * 4 * u * (1 - u) - 0.1 + 0.1 * u
        }
        playerGroup.position.y = jumpState.baseY + jumpY
        // Release ball at the apex
        const shot = (jumpState as any).pendingShot
        if (shot && progress >= jumpState.ballRelease) {
          const { start, target, dx, dz, horizDist, isDunk, isThree } = shot
          if (isDunk) {
            // SLAM DUNK — push ball straight through rim from above
            ball.position.set(target.x, target.y + 0.5, target.z)
            ballState.vel.set(0, -8, 0)
          } else {
            // Jump shot / three — release from peak position
            const releaseY = jumpState.baseY + jumpState.peakY + 1.4
            ball.position.set(start.x, releaseY, start.z)
            const apexY = target.y + (isThree ? 3.5 : 2.0)
            const g = 9.8 * 1.5
            const timeUp = isThree ? 0.45 : 0.4
            const timeDown = isThree ? 0.7 : 0.55
            const vy = (apexY - releaseY) / timeUp + 0.5 * g * timeUp
            const totalTime = timeUp + timeDown
            const vx = dx / totalTime
            const vz = dz / totalTime
            ballState.vel.set(vx, vy, vz)
          }
          ballState.held = false
          ballState.scoredThisShot = false
          ballState.airborneFrames = 0
          ;(ballState as any).rimHitThisShot = false
          ;(ballState as any).bbHitThisShot = false
          ;(ballState as any).airTime = 0
          ;(ballState as any).bounces = 0
          ballState.returnTimer = 0
          setHoopScore((s) => ({ ...s, attempts: s.attempts + 1 }))
          ;(jumpState as any).pendingShot = null
        }
        if (jumpState.t >= jumpState.duration) {
          jumpState.active = false
          playerGroup.position.y = jumpState.baseY
        }
      }
      ;(scene.userData as any).gravity = (g: number) => {
        const ballRef = (scene.userData as any).ball
        if (!ballRef) return
        const { ball, ballState, RIM_POS } = ballRef
        if (ballState.held) return
        ballState.airborneFrames++
        ballState.vel.y -= 9.8 * 1.5 * g  // g here is dtSec
        ball.position.x += ballState.vel.x * g
        ball.position.y += ballState.vel.y * g
        ball.position.z += ballState.vel.z * g
        // Phase 16.64 — REAL rim + backboard collision with velocity bounce.
        // Previously these blocks only triggered SFX; ball passed through both
        // like ghosts. Now: rim ring (torus major-radius 0.35, tube 0.04)
        // reflects ball off its outer ring using the radial normal in XZ;
        // backboard plane reflects Z-velocity. Restitution tuned to feel like
        // 2K — rim bounces are soft (0.5), backboard is harder (0.7).
        const dx = ball.position.x - RIM_POS.x
        const dz = ball.position.z - RIM_POS.z
        const horizDist = Math.hypot(dx, dz)
        const dy = Math.abs(ball.position.y - RIM_POS.y)
        // Made-shot detection (only while moving downward through inner radius)
        if (!ballState.scoredThisShot && ballState.vel.y < 0) {
          if (horizDist < 0.30 && dy < 0.18) {
            ballState.scoredThisShot = true
            setHoopScore((s) => ({ makes: s.makes + 1, attempts: s.attempts, streak: s.streak + 1 }))
            playSwish()
            // Net drag — kill horizontal vel, slow descent for realism
            ballState.vel.x *= 0.2
            ballState.vel.z *= 0.2
            ballState.vel.y = Math.max(ballState.vel.y, -2.5)
          }
        }
        // Rim bounce — ball is on the torus ring (between inner 0.30 and outer 0.42)
        // at rim height. Reflect velocity radially outward in XZ plane.
        if (!ballState.scoredThisShot && horizDist > 0.30 && horizDist < 0.42 && dy < 0.12) {
          const rimCooldown = ((ballState as any).rimBounceCooldown || 0)
          if (rimCooldown <= 0) {
            ;(ballState as any).rimBounceCooldown = 0.12
            const nx = dx / (horizDist || 1)
            const nz = dz / (horizDist || 1)
            const vDotN = ballState.vel.x * nx + ballState.vel.z * nz
            if (vDotN < 0) {
              // Reflect horizontal component off rim normal, dampen
              ballState.vel.x -= 2 * vDotN * nx * 0.5
              ballState.vel.z -= 2 * vDotN * nz * 0.5
              ballState.vel.x *= 0.55
              ballState.vel.z *= 0.55
              ballState.vel.y *= 0.6
              // Nudge ball just outside rim ring so it doesn't re-collide
              ball.position.x = RIM_POS.x + nx * 0.43
              ball.position.z = RIM_POS.z + nz * 0.43
            }
            ;(ballState as any).rimHitThisShot = true
            playRim()
          }
        }
        if ((ballState as any).rimBounceCooldown > 0) {
          ;(ballState as any).rimBounceCooldown -= g
        }
        // Backboard bounce — plane at Z = RIM_POS.z - 0.15, normal +Z (NBA spec).
        // Ball must be coming AT the board (vel.z opposite of normal sign).
        // direction-aware: rim sits at (-0.3 * dir) from baseZ, board at (-0.7 * dir).
        // Normal points back toward court — same sign as -dir.
        const boardZ = RIM_POS.z - 0.15  // NBA: backboard 0.15m back from rim center
        const boardNormalZ = Math.sign(ball.position.z - boardZ) || 1
        if (!ballState.scoredThisShot &&
            Math.abs(ball.position.z - boardZ) < 0.12 &&
            Math.abs(ball.position.x) < 1.0 &&
            ball.position.y > 3.2 && ball.position.y < 4.4) {
          const bbCooldown = ((ballState as any).bbBounceCooldown || 0)
          if (bbCooldown <= 0 && (ballState.vel.z * boardNormalZ) < 0) {
            ;(ballState as any).bbBounceCooldown = 0.15
            ballState.vel.z = -ballState.vel.z * 0.7
            ballState.vel.x *= 0.85
            ballState.vel.y *= 0.92
            // Push ball off the board so it doesn't re-trigger
            ball.position.z = boardZ + boardNormalZ * 0.14
            ;(ballState as any).bbHitThisShot = true
            playBackboard()
          }
        }
        if ((ballState as any).bbBounceCooldown > 0) {
          ;(ballState as any).bbBounceCooldown -= g
        }
        // Floor collision — max 2 bounces then force settle
        if (ball.position.y < 0.18) {
          ball.position.y = 0.18
          ;(ballState as any).bounces = ((ballState as any).bounces || 0) + 1
          if (ballState.vel.y < -2 && (ballState as any).bounces < 2) {
            ballState.vel.y = -ballState.vel.y * 0.4
            ballState.vel.x *= 0.55
            ballState.vel.z *= 0.55
          } else {
            ballState.vel.set(0, 0, 0)
            if (ballState.returnTimer <= 0) ballState.returnTimer = 0.6
          }
          if (!ballState.scoredThisShot && ballState.airborneFrames > 5) {
            setHoopScore((s) => ({ ...s, streak: 0 }))
            ballState.scoredThisShot = true
            // Phase 16.64 — MISS callout so player has visual feedback that
            // the shot didn't drop. Pairs with rim/backboard SFX + bounce.
            const hitRim = !!(ballState as any).rimHitThisShot
            const hitBoard = !!(ballState as any).bbHitThisShot
            const missText = hitRim ? 'RIM OUT' : hitBoard ? 'OFF BOARD' : 'AIRBALL'
            const missColor = hitRim ? '#fb923c' : hitBoard ? '#f87171' : '#9ca3af'
            setShotResult({ text: missText, color: missColor, bornAt: performance.now() })
          }
        }
        // Phase 16.39 — HARD 2.5s watchdog + OOB rescue
        ;(ballState as any).airTime = ((ballState as any).airTime || 0) + g
        const outOfBoundsCity = Math.abs(ball.position.x) > 12 ||
                                Math.abs(ball.position.z - RIM_POS.z) > 14 ||
                                ball.position.y > 25
        if (outOfBoundsCity && ballState.returnTimer <= 0) {
          ballState.returnTimer = 0.3
        }
        if ((ballState as any).airTime > 2.5 && ballState.returnTimer <= 0) {
          ballState.returnTimer = 0.05
        }
        // Return to hand after ball settles
        if (ballState.returnTimer > 0) {
          ballState.returnTimer -= g
          if (ballState.returnTimer <= 0) {
            ballState.held = true
            ballState.vel.set(0, 0, 0)
            ;(ballState as any).airTime = 0
            ;(ballState as any).bounces = 0
            ;(ballState as any).rimHitThisShot = false
            ;(ballState as any).bbHitThisShot = false
          }
        }
      }

      // Phase 16.15 — multiplayer pickup game sign (DEFERRED)
      // Until WebRTC/Socket.IO server infrastructure is online, the court is
      // single-player visit-only. Sign tells visitors the multiplayer is
      // coming + invites them to share the URL so friends can show up
      // (today they'd see solo; future they'd see each other's avatars).
      const comingSignCanvas = document.createElement('canvas')
      comingSignCanvas.width = 1024; comingSignCanvas.height = 192
      const cctx = comingSignCanvas.getContext('2d')!
      cctx.fillStyle = 'rgba(0,0,0,0.85)'; cctx.fillRect(0, 0, 1024, 192)
      cctx.strokeStyle = '#22d3ee'; cctx.lineWidth = 3
      cctx.setLineDash([12, 12]); cctx.strokeRect(12, 12, 1000, 168)
      cctx.setLineDash([])
      cctx.fillStyle = '#22d3ee'; cctx.font = 'bold 38px monospace'; cctx.textAlign = 'center'
      cctx.fillText('🚧 PICKUP GAMES — COMING SOON', 512, 65)
      cctx.fillStyle = '#ffffff'; cctx.font = '24px monospace'
      cctx.fillText('2v2 multiplayer · share this gallery URL', 512, 110)
      cctx.fillText('to invite friends · play w/ controllers', 512, 145)
      const comingSignTex = new THREE.CanvasTexture(comingSignCanvas)
      const comingSign = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 0.95),
        new THREE.MeshStandardMaterial({ map: comingSignTex, emissive: 0x22d3ee, emissiveIntensity: 0.15, emissiveMap: comingSignTex, transparent: true }),
      )
      comingSign.position.set(-7, 2.5, courtZ + 1)
      comingSign.rotation.y = Math.PI / 6
      scene.add(comingSign)

      // Phase 16.26 — LOCATION SIGN at spawn point. Updates when user
      // searches a city/street in the HUD search bar. Default shows "spawn"
      // copy with hint to use the search. After search, shows the address.
      // The canvas + texture refs are stored at scene level so the search-
      // result useEffect (below) can mutate them without rebuilding the scene.
      const locSignCanvas = document.createElement('canvas')
      locSignCanvas.width = 1024; locSignCanvas.height = 192
      const locCtx = locSignCanvas.getContext('2d')!
      const paintLocSign = (loc: { label: string; lat: number; lng: number } | null) => {
        locCtx.fillStyle = 'rgba(0,0,0,0.85)'; locCtx.fillRect(0, 0, 1024, 192)
        locCtx.strokeStyle = '#facc15'; locCtx.lineWidth = 4; locCtx.strokeRect(8, 8, 1008, 176)
        locCtx.fillStyle = '#facc15'; locCtx.font = 'bold 36px monospace'; locCtx.textAlign = 'center'
        if (loc) {
          locCtx.fillText('📍 NOW EXPLORING', 512, 60)
          locCtx.fillStyle = '#ffffff'; locCtx.font = 'bold 28px monospace'
          // Wrap long addresses across 2 lines
          const words = loc.label.split(' ')
          const lines: string[] = []
          let line = ''
          for (const w of words) {
            if ((line + ' ' + w).trim().length > 38) { lines.push(line.trim()); line = w }
            else line = (line + ' ' + w).trim()
          }
          if (line) lines.push(line)
          lines.slice(0, 2).forEach((ln, i) => locCtx.fillText(ln, 512, 105 + i * 32))
          locCtx.fillStyle = '#facc15'; locCtx.font = '18px monospace'
          locCtx.fillText(`${loc.lat.toFixed(4)}°, ${loc.lng.toFixed(4)}°`, 512, 170)
        } else {
          locCtx.fillText('🌍 OPEN WORLD', 512, 60)
          locCtx.fillStyle = '#ffffff'; locCtx.font = '24px monospace'
          locCtx.fillText('search any city or address in the HUD', 512, 105)
          locCtx.fillText('to set your "you are here" location', 512, 140)
          locCtx.fillStyle = '#facc15'; locCtx.font = '18px monospace'
          locCtx.fillText('try: "Times Square Manhattan"', 512, 175)
        }
      }
      paintLocSign(cityLocationRef.current)
      const locSignTex = new THREE.CanvasTexture(locSignCanvas)
      const locSign = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 1.3),
        new THREE.MeshStandardMaterial({ map: locSignTex, emissive: 0xfacc15, emissiveIntensity: 0.2, emissiveMap: locSignTex, transparent: true }),
      )
      locSign.position.set(0, 3.5, 8)  // in front of spawn (player spawns at z=5, sign faces them)
      locSign.rotation.y = Math.PI  // face the player
      scene.add(locSign)
      // Store refs on the scene's userData so the cityLocation useEffect can update
      ;(scene.userData as any).locSign = { canvas: locSignCanvas, paint: paintLocSign, texture: locSignTex }

      // Streetlamps every 12 units on both sides for the full city length
      for (let lz = -90; lz <= 90; lz += 12) {
        ;[-15, 15].forEach((lx) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.4 })
          )
          pole.position.set(lx, 2.5, lz)
          pole.castShadow = true
          scene.add(pole)
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
          )
          arm.position.set(lx + (lx > 0 ? -0.75 : 0.75), 5, lz)
          scene.add(arm)
          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xfff7c2, emissive: 0xfff7c2, emissiveIntensity: 0.8 })
          )
          bulb.position.set(lx + (lx > 0 ? -1.5 : 1.5), 4.9, lz)
          scene.add(bulb)
          const lampLight = new THREE.PointLight(0xfff7c2, 0.7, 8)
          lampLight.position.copy(bulb.position)
          scene.add(lampLight)
        })
      }
    }

    // Grid lines for depth
    const gridHelper = new THREE.GridHelper(40, 20, themeCfg.accent, themeCfg.accent)
    ;(gridHelper.material as THREE.Material).transparent = true
    ;(gridHelper.material as THREE.Material).opacity = 0.15
    scene.add(gridHelper)

    // ─── Walls (4 walls, frames mounted on them) ─────────────
    // Phase 16.25 — city theme is OPEN WORLD: no enclosing walls/ceiling,
    // skybox dome instead. Gallery themes (modern/cyberpunk/vinyl/vault) keep
    // their 4 walls + ceiling because that's the gallery-room UX.
    const wallMat = new THREE.MeshStandardMaterial({ color: themeCfg.wall, metalness: 0.3, roughness: 0.7 })
    const wallHeight = 8
    const wallLength = 40

    if (!isOutdoor) {
      // For gym, walls are bigger (30u high gym ceiling) and longer
      const gymExpand = isGymCourt ? 1.5 : 1
      const gymHeight = isGymCourt ? 22 : wallHeight
      const useLen = wallLength * gymExpand
      // Back wall
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
      backWall.position.set(0, gymHeight / 2, -useLen / 2)
      backWall.receiveShadow = true
      scene.add(backWall)

      // Front + side walls + ceiling
      if (isGymCourt) {
        // Gym: closed box, all 4 walls + ceiling, no door gap
        const fw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        fw.position.set(0, gymHeight / 2, useLen / 2)
        fw.rotation.y = Math.PI
        scene.add(fw)
        const lw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        lw.position.set(-useLen / 2, gymHeight / 2, 0)
        lw.rotation.y = Math.PI / 2
        scene.add(lw)
        const rw = new THREE.Mesh(new THREE.PlaneGeometry(useLen, gymHeight), wallMat)
        rw.position.set(useLen / 2, gymHeight / 2, 0)
        rw.rotation.y = -Math.PI / 2
        scene.add(rw)
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5e8c8, metalness: 0.1, roughness: 0.9 })
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(useLen, useLen), ceilingMat)
        ceiling.position.y = gymHeight
        ceiling.rotation.x = Math.PI / 2
        scene.add(ceiling)
      } else {
        // Front wall (with door gap)
        const frontWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(15, wallHeight), wallMat)
        frontWallLeft.position.set(-12.5, wallHeight / 2, wallLength / 2)
        frontWallLeft.rotation.y = Math.PI
        scene.add(frontWallLeft)
        const frontWallRight = new THREE.Mesh(new THREE.PlaneGeometry(15, wallHeight), wallMat)
        frontWallRight.position.set(12.5, wallHeight / 2, wallLength / 2)
        frontWallRight.rotation.y = Math.PI
        scene.add(frontWallRight)
        // Side walls
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallHeight), wallMat)
        leftWall.position.set(-wallLength / 2, wallHeight / 2, 0)
        leftWall.rotation.y = Math.PI / 2
        scene.add(leftWall)
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallHeight), wallMat)
        rightWall.position.set(wallLength / 2, wallHeight / 2, 0)
        rightWall.rotation.y = -Math.PI / 2
        scene.add(rightWall)
        // Ceiling
        const ceilingMat = new THREE.MeshStandardMaterial({ color: themeCfg.wall, metalness: 0.2, roughness: 0.8 })
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, wallLength), ceilingMat)
        ceiling.position.y = wallHeight
        ceiling.rotation.x = Math.PI / 2
        scene.add(ceiling)
      }
    } else {
      // CITY OPEN WORLD — dome skybox + atmospheric horizon, no walls/ceiling
      const skyGeo = new THREE.SphereGeometry(280, 32, 16)
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x0a1228) },
          bottomColor: { value: new THREE.Color(0x2a1a14) },
          offset: { value: 33 },
          exponent: { value: 0.7 },
        },
        vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0); }`,
      })
      const sky = new THREE.Mesh(skyGeo, skyMat)
      scene.add(sky)
      // Phase 16.35 — distant city silhouette varies PER SEARCHED LOCATION.
      // Hash the city label (or default "Open World") into a seed → drives
      // building count, height range, density, palette tint, fog hue, window
      // brightness. Different city searches now produce visually distinct
      // skylines instead of the same generic horizon.
      const seedSource = cityLocationRef.current?.label || 'Open World'
      let seed = 0
      for (let i = 0; i < seedSource.length; i++) seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0
      const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) >>> 0
        return (seed >>> 16) / 65535
      }
      // Per-city derived parameters
      const cityHueShift = seededRandom() * 360       // base palette hue
      const cityBldgCount = 22 + Math.floor(seededRandom() * 16)  // 22-38
      const cityMaxHeight = 18 + seededRandom() * 32  // 18-50 — Tokyo skyscrapers vs Brooklyn lowrise
      const cityDensity = 0.55 + seededRandom() * 0.4 // window lit ratio
      const cityWindowHue = Math.floor(seededRandom() * 60) - 30  // 30° shift around warm yellow
      // Update fog tint from city seed
      const fogR = 0.10 + (seededRandom() * 0.15)
      const fogG = 0.06 + (seededRandom() * 0.12)
      const fogB = 0.03 + (seededRandom() * 0.20)
      if (scene.fog && (scene.fog as any).color) (scene.fog as any).color.setRGB(fogR, fogG, fogB)
      // Update sky shader bottom color from fog (atmospheric horizon match)
      if ((skyMat as any).uniforms?.bottomColor) {
        (skyMat as any).uniforms.bottomColor.value.setRGB(fogR * 1.5, fogG * 1.4, fogB * 1.3)
      }
      // Build the horizon
      for (let i = 0; i < cityBldgCount; i++) {
        const angle = (i / cityBldgCount) * Math.PI * 2
        const r = 130 + seededRandom() * 35
        const w = 8 + seededRandom() * 12
        const h = 12 + seededRandom() * cityMaxHeight
        const d = 8 + seededRandom() * 12
        // Hue rotates around the seed's base shift so all buildings feel
        // like the same "city palette"
        const localHue = ((cityHueShift + (seededRandom() - 0.5) * 40) % 360 + 360) % 360
        const bldgColor = new THREE.Color().setHSL(localHue / 360, 0.35, 0.08)
        const bldgEmissive = new THREE.Color().setHSL(localHue / 360, 0.45, 0.15)
        const bldgMat = new THREE.MeshStandardMaterial({ color: bldgColor, emissive: bldgEmissive, emissiveIntensity: 0.06, roughness: 0.9 })
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat)
        bldg.position.set(Math.sin(angle) * r, h / 2, Math.cos(angle) * r)
        bldg.rotation.y = angle + Math.PI
        scene.add(bldg)
        // Lit windows — count + color from city seed
        if (seededRandom() < cityDensity) {
          const winHue = ((50 + cityWindowHue) % 360 + 360) % 360  // ~yellow base shifted per-city
          const winColor = new THREE.Color().setHSL(winHue / 360, 0.8, 0.55)
          const winMat = new THREE.MeshBasicMaterial({ color: winColor, transparent: true, opacity: 0.7 })
          const winRows = 2 + Math.floor(seededRandom() * 3)
          for (let wi = 0; wi < winRows; wi++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), winMat)
            const wy = 3 + seededRandom() * (h - 6)
            const wx = (seededRandom() - 0.5) * (w - 2)
            win.position.set(Math.sin(angle) * (r - d / 2 - 0.1) + Math.cos(angle) * wx, wy, Math.cos(angle) * (r - d / 2 - 0.1) - Math.sin(angle) * wx)
            win.rotation.y = angle + Math.PI
            scene.add(win)
          }
        }
      }
      // Store seed/params on scene so the location-search useEffect can
      // rebuild the horizon when a new city is searched without re-mounting.
      ;(scene.userData as any).citySeed = seed
      ;(scene.userData as any).rebuildHorizon = () => {
        // For future ship — currently a full scene rebuild is needed for new
        // city. Saved here as a hook for the next iteration to swap horizon
        // without re-mounting the whole gallery.
      }
    }

    // ─── Frames (one per track, distributed around walls) ────
    const frameMeshes: Array<{ group: THREE.Group; track: Track; spotlight: THREE.SpotLight }> = []
    const textureLoader = new THREE.TextureLoader()
    textureLoader.crossOrigin = 'anonymous'

    // Calculate frame positions — distribute across 4 walls
    const positions: Array<{ pos: THREE.Vector3; rot: number }> = []
    const wallPadding = 4
    const framesPerWall = Math.ceil(tracks.length / 4) || 1
    const wallSpacing = (wallLength - wallPadding * 2) / Math.max(framesPerWall, 1)

    // Back wall (z = -19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const x = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(x, 3, -19.5), rot: 0 })
    }
    // Right wall (x = 19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const z = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(19.5, 3, z), rot: -Math.PI / 2 })
    }
    // Left wall (x = -19.5)
    for (let i = 0; i < framesPerWall; i++) {
      const z = -wallLength / 2 + wallPadding + (i + 0.5) * wallSpacing
      positions.push({ pos: new THREE.Vector3(-19.5, 3, z), rot: Math.PI / 2 })
    }
    // Front wall split (avoid door)
    for (let i = 0; i < framesPerWall; i++) {
      const x = i < framesPerWall / 2
        ? -wallLength / 2 + wallPadding + (i + 0.5) * (10 / Math.max(framesPerWall / 2, 1))
        : wallLength / 2 - wallPadding - (i - framesPerWall / 2 + 0.5) * (10 / Math.max(framesPerWall / 2, 1))
      positions.push({ pos: new THREE.Vector3(x, 3, 19.5), rot: Math.PI })
    }

    // Phase 16.12 — CITY THEME BILLBOARDS. Mount large NFT-artwork billboards
    // high on the building facades (above the storefront level). Up to 6
    // billboards distributed across left/right walls. Each shows the artwork
    // of one of the user's tracks. As character walks past = ad strip /
    // GTA-style storefront branding.
    if (theme === 'city' && tracks.length > 0) {
      const billboardCount = Math.min(6, tracks.length)
      for (let bi = 0; bi < billboardCount; bi++) {
        const t = tracks[bi]
        if (!t.artworkUrl) continue
        const isLeft = bi % 2 === 0
        const x = isLeft ? -18.4 : 18.4
        // Distribute along z within sidewalk range
        const z = -14 + (Math.floor(bi / 2)) * 10
        // Billboard "frame" — dark backing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.4 })
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 6.2), frameMat)
        frameMesh.position.set(x, 6, z)
        scene.add(frameMesh)
        // Artwork plane on top of the frame
        textureLoader.load(
          t.artworkUrl,
          (tex) => {
            const billMat = new THREE.MeshStandardMaterial({
              map: tex,
              emissive: 0xffffff,
              emissiveIntensity: 0.25,
              emissiveMap: tex,
            })
            const bill = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), billMat)
            bill.position.set(x + (isLeft ? 0.16 : -0.16), 6, z)
            bill.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2
            scene.add(bill)
            // Caption strip below billboard
            const labelCanvas = document.createElement('canvas')
            labelCanvas.width = 512; labelCanvas.height = 96
            const lctx = labelCanvas.getContext('2d')!
            lctx.fillStyle = '#0a0a0a'; lctx.fillRect(0, 0, 512, 96)
            lctx.fillStyle = '#facc15'; lctx.font = 'bold 36px monospace'; lctx.textAlign = 'center'
            lctx.fillText((t.title || 'TRACK').slice(0, 24).toUpperCase(), 256, 50)
            if (t.artist) {
              lctx.fillStyle = '#ffffff'; lctx.font = '20px monospace'
              lctx.fillText(`@ ${t.artist}`.slice(0, 32), 256, 78)
            }
            const labelTex = new THREE.CanvasTexture(labelCanvas)
            const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, emissive: 0xfacc15, emissiveIntensity: 0.3, emissiveMap: labelTex })
            const label = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.9), labelMat)
            label.position.set(x + (isLeft ? 0.16 : -0.16), 3.6, z)
            label.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2
            scene.add(label)
          },
          undefined,
          (err) => console.warn('[GalleryRoom3D] billboard texture failed:', err),
        )
        // Spotlight illuminating the billboard
        const spot = new THREE.SpotLight(0xffffff, 1.5, 12, Math.PI / 6, 0.4, 1)
        spot.position.set(x + (isLeft ? 3 : -3), 9, z)
        spot.target.position.set(x, 6, z)
        scene.add(spot)
        scene.add(spot.target)
      }
    }

    // Phase 16.62 — gym + blacktop are basketball game scenes, NOT art
    // galleries. Skip the NFT frame placement entirely so the court isn't
    // cluttered with floating album art.
    const skipFrames = isBasketballGallery
    tracks.forEach((track, i) => {
      if (skipFrames) return
      if (i >= positions.length) return
      const { pos, rot } = positions[i]
      const group = new THREE.Group()

      // Frame (gold/silver border around image)
      const frameMat = new THREE.MeshStandardMaterial({
        color: track.isNFT ? 0xfacc15 : 0x9ca3af,
        emissive: track.isNFT ? 0xfacc15 : 0x9ca3af,
        emissiveIntensity: 0.1,
        metalness: 0.9,
        roughness: 0.2,
      })
      const frameGeo = new THREE.BoxGeometry(2.4, 2.4, 0.15)
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.castShadow = true
      group.add(frame)

      // Inner art canvas
      const artGeo = new THREE.PlaneGeometry(2.1, 2.1)
      const artMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
      const art = new THREE.Mesh(artGeo, artMat)
      art.position.z = 0.08
      ;(art as any).userData = { track }
      group.add(art)

      // Try to load artwork texture
      if (track.artworkUrl) {
        textureLoader.load(track.artworkUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          art.material = new THREE.MeshBasicMaterial({ map: tex })
        }, undefined, () => {
          // Fallback: gradient
          art.material = new THREE.MeshBasicMaterial({ color: 0x222244 })
        })
      } else {
        art.material = new THREE.MeshBasicMaterial({ color: 0x222244 })
      }

      // Title plaque below frame
      const plaqueCanvas = document.createElement('canvas')
      plaqueCanvas.width = 512
      plaqueCanvas.height = 128
      const pctx = plaqueCanvas.getContext('2d')!
      pctx.fillStyle = 'rgba(0,0,0,0.85)'
      pctx.fillRect(0, 0, 512, 128)
      pctx.fillStyle = '#ffffff'
      pctx.font = 'bold 36px monospace'
      pctx.textAlign = 'center'
      pctx.fillText((track.title || 'Untitled').slice(0, 22), 256, 50)
      pctx.fillStyle = `#${themeCfg.accent.toString(16).padStart(6, '0')}`
      pctx.font = '24px monospace'
      pctx.fillText((track.artist || ownerHandle).slice(0, 28), 256, 84)
      if (track.editionSize && track.editionSize > 1) {
        pctx.fillStyle = '#facc15'
        pctx.font = 'bold 20px monospace'
        pctx.fillText(`1/${track.editionSize}`, 256, 110)
      }
      const plaqueTex = new THREE.CanvasTexture(plaqueCanvas)
      const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ map: plaqueTex }))
      plaque.scale.set(2.4, 0.6, 1)
      plaque.position.y = -1.7
      group.add(plaque)

      // Spotlight on the frame
      const spotlight = new THREE.SpotLight(0xffffff, 1.5, 8, Math.PI / 4, 0.4, 1)
      spotlight.position.set(pos.x + Math.sin(rot) * 1.5, pos.y + 3, pos.z + Math.cos(rot) * 1.5)
      spotlight.target = group
      spotlight.castShadow = true
      scene.add(spotlight)

      group.position.copy(pos)
      group.rotation.y = rot
      scene.add(group)
      frameMeshes.push({ group, track, spotlight })

      // Audio element for music tracks
      if (track.playbackUrl) {
        const audio = new Audio(track.playbackUrl)
        audio.crossOrigin = 'anonymous'
        audio.loop = true
        audio.volume = 0
        audio.preload = 'metadata'
        audioRefsMap.current.set(track.id, audio)
      }
    })

    // ─── Player avatar — saved character (GLB if available, capsule fallback) ──
    // Phase 16.11 + 16.28 — reads the same character config the user saves in
    // CharacterDesigner. Loads GLB if any URL is present. ALSO listens for
    // 'character-updated' events so when user generates a new character in
    // a different tab / via Save as Avatar without leaving the page, the
    // gallery swaps the avatar in-place (no full scene rebuild).
    const playerGroup = new THREE.Group()
    ;(scene.userData as any).playerGroupRef = playerGroup
    playerGroup.position.set(0, 0, 5)
    scene.add(playerGroup)

    // The avatar mesh is held in a sub-group so we can clear + rebuild on
    // character-updated events without touching playerGroup's position/rotation.
    const avatarHolder = new THREE.Group()
    playerGroup.add(avatarHolder)

    // Phase 16.40/16.41 — XBot rigged avatar w/ AnimationMixer + full 2K
    // move-set authored as custom AnimationClips via QuaternionKeyframeTrack.
    const buildXBotPlayer = () => {
      const loader = new GLTFLoader()
      const XBOT_URL = 'https://threejs.org/examples/models/gltf/Xbot.glb'
      const loadGltf = (url: string): Promise<any> => new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject)
      })
      // Phase 16.67 — if the user designed a custom character (RPM /
      // AI-generated rigged GLB), use THEIR model as the player. We still
      // load XBot in parallel to harvest its idle/walk/run animation
      // clips, then retarget the track names onto the user's bone
      // hierarchy. Static (un-rigged) meshes like TripoSR can't accept
      // animations — those silently fall back to XBot.
      const charProbe = getStoredCharacter()
      const probeGlb = (charProbe as any).aiGlbUrl || charProbe.humanGlbUrl
      const hasSkin = (root: THREE.Object3D): boolean => {
        let found = false
        root.traverse((o: any) => { if (o.isSkinnedMesh) found = true })
        return found
      }
      // Phase 16.67 — retarget an XBot AnimationClip so its track-name
      // prefixes match an arbitrary model's bone hierarchy. XBot uses
      // 'mixamorigHips', 'mixamorigLeftArm', etc; RPM uses 'Hips',
      // 'LeftArm', etc. Same skeleton topology, just different naming.
      // We resolve each track's bone name against the target model
      // (case-insensitive endsWith) and rewrite the track if a match
      // exists, drop the track if no bone matches at all.
      const retargetClip = (clip: THREE.AnimationClip, target: THREE.Object3D): THREE.AnimationClip => {
        const boneNames = new Set<string>()
        target.traverse((o: any) => { if (o.isBone || o.name) boneNames.add(o.name) })
        const findBoneName = (rawName: string): string | null => {
          if (boneNames.has(rawName)) return rawName
          const lower = rawName.toLowerCase()
          for (const n of boneNames) if (n.toLowerCase() === lower) return n
          // Try stripping mixamorig prefix
          if (lower.startsWith('mixamorig')) {
            const stripped = rawName.slice('mixamorig'.length)
            if (boneNames.has(stripped)) return stripped
            for (const n of boneNames) if (n.toLowerCase() === stripped.toLowerCase()) return n
          }
          // Try ADDING mixamorig prefix
          const prefixed = `mixamorig${rawName}`
          if (boneNames.has(prefixed)) return prefixed
          for (const n of boneNames) if (n.toLowerCase() === prefixed.toLowerCase()) return n
          return null
        }
        const newTracks: THREE.KeyframeTrack[] = []
        for (const track of clip.tracks) {
          const dotIdx = track.name.indexOf('.')
          if (dotIdx < 0) { newTracks.push(track); continue }
          const boneName = track.name.slice(0, dotIdx)
          const property = track.name.slice(dotIdx)
          const matched = findBoneName(boneName)
          if (!matched) continue  // drop track — no matching bone
          if (matched === boneName) { newTracks.push(track); continue }
          const cloned = track.clone()
          cloned.name = matched + property
          newTracks.push(cloned)
        }
        const out = new THREE.AnimationClip(clip.name, clip.duration, newTracks)
        return out
      }
      const proceed = (modelGltf: any, animSourceGltf: any, isCustomModel: boolean) => {
          const model = modelGltf.scene
          const preBox = new THREE.Box3().setFromObject(model)
          const preSize = new THREE.Vector3(); preBox.getSize(preSize)
          if (preSize.y > 0 && (preSize.y < 0.5 || preSize.y > 4)) {
            model.scale.setScalar(1.8 / preSize.y)
          }
          model.traverse((obj: any) => {
            if (obj.isMesh) {
              obj.castShadow = true
              obj.receiveShadow = true
            }
          })

          // Phase 16.42 — apply user's CharacterConfig to XBot materials so
          // the player on the court LOOKS LIKE THE CHARACTER THEY DESIGNED
          // in CharacterDesigner. XBot ships w/ multiple meshes (Beta_*,
          // head, hair); tint each by name heuristic. Skin tone tints face
          // /limb meshes, body color tints jersey/torso, hair color tints
          // hair mesh. Materials are cloned so the cache copy stays clean
          // for the next theme switch. character-updated event listener
          // already tears down + rebuilds, so live designer edits propagate
          // to the court in real time (same flow as buildCapsule themes).
          const charForXBot = getStoredCharacter()
          const bodyColor = new THREE.Color(charForXBot.bodyColor || '#22d3ee')
          const skinHex = (charForXBot as any).face?.skinTone || (charForXBot as any).skinColor || '#d4a373'
          const skinColor = new THREE.Color(skinHex)
          const HAIR_COLOR_HEX: Record<string, string> = {
            black: '#1a1a1a', brown: '#5a3a1a', blonde: '#e6c98a', red: '#a02020',
            silver: '#c0c0c0', cyan: '#22d3ee', pink: '#ec4899', purple: '#a855f7',
            rainbow: '#ec4899', platinum: '#e5e4e2', ginger: '#c4602f', 'two-tone': '#5a3a1a',
          }
          const hairHex = (charForXBot as any).hairColorHex
            || HAIR_COLOR_HEX[charForXBot.hairColor as string]
            || '#1a1a1a'
          const hairColor = new THREE.Color(hairHex)
          const accentHex = (charForXBot as any).accentColor || (charForXBot as any).glowColor
          // Phase 16.67 — custom GLBs (RPM, AI-generated) keep their own
          // baked textures + materials. Only XBot gets the heuristic
          // jersey/skin/hair retint.
          if (!isCustomModel) model.traverse((obj: any) => {
            if (!obj.isMesh || !obj.material) return
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
            const cloned = materials.map((mat: any) => {
              const m = mat.clone()
              const key = `${(obj.name || '').toLowerCase()} ${(mat.name || '').toLowerCase()}`
              if (/face|head|skin|joint|eye/.test(key)) {
                m.color = skinColor.clone()
              } else if (/hair/.test(key)) {
                m.color = hairColor.clone()
              } else if (/short|pant|leg|sneaker|shoe/.test(key) && accentHex) {
                m.color = new THREE.Color(accentHex)
              } else {
                // Default: jersey / body / clothing → user's bodyColor
                m.color = bodyColor.clone()
              }
              // Slight emissive lift on jersey tint so it reads on dark
              // courts (matches buildCapsule's jersey emissive treatment).
              if (m.emissive && !/face|head|skin|hair/.test(key)) {
                m.emissive = bodyColor.clone().multiplyScalar(0.08)
              }
              return m
            })
            obj.material = Array.isArray(obj.material) ? cloned : cloned[0]
          })

          // Honor user's height multiplier — buildCapsule themes already
          // do this, but the sports-theme branch skipped buildAvatar's
          // scaling math (line ~1888-1889). 1.0 default = no change.
          const heightMul = charForXBot.height ?? 1
          if (heightMul !== 1 && heightMul > 0) model.scale.multiplyScalar(heightMul)

          // Phase 16.61 — DO NOT rotate the model. Mixamo XBot faces +Z by
          // default. We canonicalize on +Z facing across the whole
          // codebase: ball-hand offset uses (sin θ, cos θ) (+Z convention),
          // shootRef uses atan2(dx, dz) (+Z convention), and WASD now uses
          // atan2(dirX, dirZ) too (was atan2(dirX, -dirZ) which was the
          // outlier -Z convention). One axis convention = everything aligns:
          // model faces where it walks, ball sits in front of the model.
          avatarHolder.add(model)

          // Phase 16.70 — name badge floating above player's head (2K style).
          // CanvasTexture w/ handle + cyan tint, mounted as a billboard
          // Sprite so it tracks the camera angle automatically.
          const myChar = getStoredCharacter()
          const myName = ((myChar as any).name || 'YOU').toString().slice(0, 12).toUpperCase()
          const nameCanvas = document.createElement('canvas')
          nameCanvas.width = 256; nameCanvas.height = 96
          const nctx = nameCanvas.getContext('2d')!
          nctx.fillStyle = 'rgba(0,0,0,0.55)'
          nctx.fillRect(0, 0, 256, 96)
          nctx.fillStyle = '#22d3ee'
          nctx.font = 'bold 56px monospace'
          nctx.textAlign = 'center'
          nctx.fillText(myName, 128, 66)
          const nameTex = new THREE.CanvasTexture(nameCanvas)
          const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false }))
          nameSprite.scale.set(1.4, 0.5, 1)
          nameSprite.position.set(0, 2.55, 0)
          avatarHolder.add(nameSprite)

          // Phase 16.67 — Source animations from XBot regardless of which
          // mesh is rendered. Retarget track names so XBot's clips bind to
          // the loaded model's actual bone hierarchy (mixamorigHips →
          // Hips for RPM models, etc).
          const rawAnims: THREE.AnimationClip[] = animSourceGltf?.animations || []
          if (rawAnims.length === 0) return
          const xbotAnims = isCustomModel
            ? rawAnims.map(c => retargetClip(c, model))
            : rawAnims
          const mixer = new THREE.AnimationMixer(model)
          const clipMap: Record<string, THREE.AnimationAction> = {}
          for (const clip of xbotAnims) {
            clipMap[clip.name.toLowerCase()] = mixer.clipAction(clip)
          }

          // ─── Phase 16.41 — Author custom 2K move clips ───
          // Collect bone names by scanning the skeleton; Mixamo prefix is the
          // standard for threejs.org/Xbot but we resolve dynamically so any
          // rig variant still wires up the clips that match its bone naming.
          const boneByName: Record<string, THREE.Bone> = {}
          model.traverse((obj: any) => {
            if (obj.isBone) boneByName[obj.name] = obj
          })
          const findBone = (...candidates: string[]) => {
            for (const c of candidates) {
              if (boneByName[c]) return boneByName[c].name
              const found = Object.keys(boneByName).find(n => n.toLowerCase().endsWith(c.toLowerCase()))
              if (found) return found
            }
            return null
          }
          const B = {
            hips:   findBone('mixamorigHips', 'Hips'),
            spine:  findBone('mixamorigSpine1', 'Spine1', 'mixamorigSpine', 'Spine'),
            head:   findBone('mixamorigHead', 'Head'),
            armL:   findBone('mixamorigLeftArm', 'LeftArm'),
            armR:   findBone('mixamorigRightArm', 'RightArm'),
            forearmL: findBone('mixamorigLeftForeArm', 'LeftForeArm'),
            forearmR: findBone('mixamorigRightForeArm', 'RightForeArm'),
            upLegL: findBone('mixamorigLeftUpLeg', 'LeftUpLeg'),
            upLegR: findBone('mixamorigRightUpLeg', 'RightUpLeg'),
            legL:   findBone('mixamorigLeftLeg', 'LeftLeg'),
            legR:   findBone('mixamorigRightLeg', 'RightLeg'),
          }
          console.log('[GalleryRoom3D] XBot bones resolved:', B)

          // Phase 16.49 — emit RAW DELTA quats (no bindQuat composition).
          // Mixamo XBot's GLB rest pose IS T-pose at the shoulders — every
          // Mixamo character is authored with arms-out as the bind. Composing
          // bindQuat * delta meant every authored clip STARTED at T-pose then
          // added a tiny delta on top — exactly what Frank sees.
          //
          // With additive blending (Phase 16.48), frame 0 = identity quat means
          // zero contribution at clip start → base layer (idle, arms at sides)
          // drives the pose unchanged. Middle frames apply the rotation delta
          // ON TOP of whatever the base layer is doing → arm rotates from the
          // idle position through the shooting arc and back to idle. Three.js
          // additive math: q_final = q_base * q_additive. With q_additive =
          // q_delta (no bindQuat baked in), q_final = q_idle * q_delta = arm
          // rotated from idle by delta. Which is what we actually want.
          const _q = new THREE.Quaternion()
          const _e = new THREE.Euler()
          const quatTrack = (bonePath: string | null, times: number[], eulers: number[][]) => {
            if (!bonePath) return null
            const flat = new Float32Array(times.length * 4)
            for (let i = 0; i < eulers.length; i++) {
              _e.set(eulers[i][0] || 0, eulers[i][1] || 0, eulers[i][2] || 0)
              _q.setFromEuler(_e)
              flat[i * 4]     = _q.x
              flat[i * 4 + 1] = _q.y
              flat[i * 4 + 2] = _q.z
              flat[i * 4 + 3] = _q.w
            }
            return new THREE.QuaternionKeyframeTrack(`${bonePath}.quaternion`, times, flat)
          }
          const buildClip = (
            name: string,
            duration: number,
            tracks: Array<ReturnType<typeof quatTrack>>,
          ) => {
            const valid = tracks.filter((t): t is THREE.QuaternionKeyframeTrack => t !== null)
            return new THREE.AnimationClip(name, duration, valid)
          }

          // Phase 16.43 — DUNK (Kobe baseline reverse vibe). 6-key sequence
          // adds RIM HANG frame (arms still overhead post-slam) + soft 2-foot
          // landing instead of snap-to-rest.
          const dunkClip = buildClip('dunk', 1.2, [
            quatTrack(B.upLegL, [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [-1.05,0,0], [-0.1,0,0], [0.0,0,0], [-0.4,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [-1.05,0,0], [-0.1,0,0], [0.0,0,0], [-0.4,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [1.55,0,0], [0.15,0,0], [0.0,0,0], [0.7,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [1.55,0,0], [0.15,0,0], [0.0,0,0], [0.7,0,0], [0,0,0]]),
            // Both arms gather low → swing up overhead at peak → SLAM down
            // → RIM HANG (arms held overhead briefly, slight bend through
            // forearm) → drop to rest
            quatTrack(B.armL,   [0, 0.18, 0.40, 0.55, 0.70, 1.0, 1.2],
              [[0,0,0], [0.2,0,0.55], [-2.7,0,0.15], [-1.8,0,0.1], [-2.5,0,0.18], [-1.0,0,0.1], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.18, 0.40, 0.55, 0.70, 1.0, 1.2],
              [[0,0,0], [0.2,0,-0.55], [-2.7,0,-0.15], [-1.8,0,-0.1], [-2.5,0,-0.18], [-1.0,0,-0.1], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.40, 0.55, 0.70, 1.2],
              [[0,0,0], [-0.5,0,0], [-0.2,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.40, 0.55, 0.70, 1.2],
              [[0,0,0], [-0.5,0,0], [-0.2,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.18, 0.40, 0.55, 0.85, 1.2],
              [[0,0,0], [0.25,0,0], [-0.25,0,0], [-0.1,0,0], [0.15,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.55, 1.2], [[0,0,0], [-0.25,0,0], [-0.1,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — LAYUP. Drive leg knee lift + extended right arm
          // scoop + BALL ROLL-OFF (wrist over-extension at finish releases
          // ball off fingertips) + plant landing.
          const layupClip = buildClip('layup', 1.1, [
            quatTrack(B.upLegR, [0, 0.20, 0.45, 0.65, 0.90, 1.1],
              [[0,0,0], [-1.45,0,0], [-0.5,0,0], [-0.2,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.20, 0.45, 0.65, 0.90, 1.1],
              [[0,0,0], [1.25,0,0], [0.35,0,0], [0.15,0,0], [0.6,0,0], [0,0,0]]),
            quatTrack(B.upLegL, [0, 0.45, 0.90, 1.1], [[0,0,0], [-0.15,0,0], [-0.25,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.45, 0.90, 1.1], [[0,0,0], [0.25,0,0], [0.45,0,0], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.20, 0.45, 0.60, 0.75, 1.1],
              [[0,0,0], [-0.95,0,0.08], [-2.55,0,0.1], [-2.65,0,0.12], [-1.7,0,0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.20, 0.45, 0.60, 0.75, 1.1],
              [[0,0,0], [-0.5,0,0], [-0.4,0,0], [0.2,0,0], [-0.15,0,0], [0,0,0]]),
            // Guide hand swings in to cradle ball pre-release
            quatTrack(B.armL,   [0, 0.20, 0.45, 0.60, 1.1],
              [[0,0,0], [-0.45,0,0.3], [-1.05,0,0.25], [-0.5,0,0.2], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.20, 0.45, 1.1], [[0,0,0], [-0.4,0,0], [-0.6,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.45, 0.65, 1.1], [[0,0,0], [-0.15,0,0.1], [-0.05,0,0.05], [0,0,0]]),
          ])

          // Phase 16.43 — FADEAWAY. Back-leaning jump shot signature: legs
          // drift back during release, spine leans further past straight,
          // shoulder rolls back to clear defender, FOLLOW THROUGH HELD during
          // back-fall, knees absorb on landing.
          const fadeawayClip = buildClip('fadeaway', 1.1, [
            quatTrack(B.upLegL, [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [-0.55,0,0], [-0.25,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [-0.55,0,0], [-0.25,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [0.85,0,0], [0.35,0,0], [0.1,0,0], [0.55,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.20, 0.45, 0.70, 0.90, 1.1],
              [[0,0,0], [0.85,0,0], [0.35,0,0], [0.1,0,0], [0.55,0,0], [0,0,0]]),
            // Shooting arm — peak release at 0.55, gooseneck hold through 0.75
            quatTrack(B.armR,   [0, 0.20, 0.40, 0.55, 0.75, 0.95, 1.1],
              [[0,0,0], [-0.45,0,0.05], [-1.6,0,0.05], [-2.55,0,0.05], [-2.6,0,0.12], [-1.1,0,0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.20, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [-0.55,0,0], [-1.0,0,0], [-0.2,0,0], [0.3,0,0], [0,0,0]]),
            // Guide hand
            quatTrack(B.armL,   [0, 0.20, 0.40, 0.55, 1.1],
              [[0,0,0], [-0.35,0,0.25], [-0.85,0,0.3], [-0.55,0,0.2], [0,0,0]]),
            // Spine back-arch — the FADEAWAY signature
            quatTrack(B.spine,  [0, 0.20, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [0.05,0,0], [-0.25,0,0], [-0.5,0,0], [-0.38,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.55, 0.75, 1.1],
              [[0,0,0], [-0.2,0,0], [-0.35,0,0], [-0.22,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — REBOUND. Two-leg explosive leap → both arms snap
          // up overhead to attack ball → ARMS CRADLE PULL DOWN (forearms
          // bend inward, ball secured to chest) → 2-foot landing.
          const reboundClip = buildClip('rebound', 0.95, [
            quatTrack(B.upLegL, [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.85,0,0], [-0.05,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.85,0,0], [-0.05,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [1.25,0,0], [0.1,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [1.25,0,0], [0.1,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.45, 0.65, 0.95],
              [[0,0,0], [-2.85,0,0.25], [-2.7,0,0.22], [-1.2,0,0.2], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.25, 0.45, 0.65, 0.95],
              [[0,0,0], [-2.85,0,-0.25], [-2.7,0,-0.22], [-1.2,0,-0.2], [0,0,0]]),
            // CRADLE PULL-DOWN — forearms bend inward, ball secured
            quatTrack(B.forearmL, [0, 0.45, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.2,0,0], [-1.3,0,-0.3], [-1.0,0,-0.25], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.45, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.2,0,0], [-1.3,0,0.3], [-1.0,0,0.25], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.40, 0.65, 0.85, 0.95],
              [[0,0,0], [-0.15,0,0], [0.05,0,0], [0.1,0,0], [0,0,0]]),
            quatTrack(B.head,   [0, 0.40, 0.95], [[0,0,0], [-0.3,0,0], [0,0,0]]),
          ])

          // DEFENSIVE STANCE — held pose, knees bent, arms out wide (loop)
          const defenseClip = buildClip('defense', 0.5, [
            quatTrack(B.upLegL, [0, 0.25, 0.5], [[-0.6,0,-0.25], [-0.65,0,-0.25], [-0.6,0,-0.25]]),
            quatTrack(B.upLegR, [0, 0.25, 0.5], [[-0.6,0,0.25],  [-0.65,0,0.25],  [-0.6,0,0.25]]),
            quatTrack(B.legL,   [0, 0.5], [[1.0,0,0], [1.0,0,0]]),
            quatTrack(B.legR,   [0, 0.5], [[1.0,0,0], [1.0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.5], [[0,0,1.0], [0.1,0,1.05], [0,0,1.0]]),
            quatTrack(B.armR,   [0, 0.25, 0.5], [[0,0,-1.0], [0.1,0,-1.05], [0,0,-1.0]]),
            quatTrack(B.spine,  [0, 0.5], [[0.2,0,0], [0.2,0,0]]),
          ])

          // Phase 16.43 — BLOCK. Vertical leap + right arm straight up to
          // swat → DOWNWARD SWAT (forearm whips down past peak = the
          // "GET THAT OUTTA HERE" motion) → 2-foot landing.
          const blockClip = buildClip('block', 0.85, [
            quatTrack(B.upLegL, [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [-0.7,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [-0.7,0,0], [-0.05,0,0], [-0.3,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [1.05,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.18, 0.45, 0.70, 0.85],
              [[0,0,0], [1.05,0,0], [0.1,0,0], [0.5,0,0], [0,0,0]]),
            // Right arm shoots straight up, then SWATS down past peak
            quatTrack(B.armR,   [0, 0.18, 0.40, 0.55, 0.85],
              [[0,0,0], [-1.5,0,-0.08], [-2.85,0,-0.05], [-1.6,0,-0.05], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.40, 0.55, 0.85],
              [[0,0,0], [-0.15,0,0], [0.35,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.25, 0.55, 0.85],
              [[0,0,0], [-0.6,0,0.35], [-0.4,0,0.25], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.40, 0.85], [[0,0,0], [-0.08,0,-0.05], [0,0,0]]),
          ])

          // PASS — chest pass: both forearms extend forward
          const passClip = buildClip('pass', 0.5, [
            quatTrack(B.armL,   [0, 0.15, 0.3, 0.5], [[0,0,0], [-0.4,0,0.4], [-0.9,0,0.3], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.15, 0.3, 0.5], [[0,0,0], [-0.4,0,-0.4], [-0.9,0,-0.3], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.15, 0.3, 0.5], [[0,0,0], [-1.2,0,0], [-0.2,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.15, 0.3, 0.5], [[0,0,0], [-1.2,0,0], [-0.2,0,0], [0,0,0]]),
          ])

          // CROSSOVER — lateral lean + arms swap
          const crossoverClip = buildClip('crossover', 0.4, [
            quatTrack(B.spine,  [0, 0.2, 0.4], [[0,0,0], [0,0,0.35], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.2, 0.4], [[0,0,0], [-0.4,0.4,0.3], [0,0,0]]),
            quatTrack(B.armR,   [0, 0.2, 0.4], [[0,0,0], [-0.4,-0.4,-0.3], [0,0,0]]),
          ])

          // PUMP FAKE — quick arm raise without ball release
          const pumpFakeClip = buildClip('pumpFake', 0.35, [
            quatTrack(B.armR,   [0, 0.15, 0.35], [[0,0,0], [-1.4,0,0], [0,0,0]]),
            quatTrack(B.forearmR, [0, 0.15, 0.35], [[0,0,0], [-0.6,0,0], [0,0,0]]),
            quatTrack(B.armL,   [0, 0.15, 0.35], [[0,0,0], [-0.3,0,0.2], [0,0,0]]),
          ])

          // JAB STEP — quick forward leg jab
          const jabStepClip = buildClip('jabStep', 0.28, [
            quatTrack(B.upLegR, [0, 0.14, 0.28], [[0,0,0], [-0.5,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.14, 0.28], [[0,0,0], [0.3,0,0], [0,0,0]]),
            quatTrack(B.spine,  [0, 0.14, 0.28], [[0,0,0], [-0.15,0,0], [0,0,0]]),
          ])

          // Phase 16.43 — JUMP SHOT (Kobe form). 8-key sequence:
          // 0.0  stance       — triple-threat, ball at hip
          // 0.15 gather       — deep knee bend, both arms lift ball to chest
          // 0.30 drive        — legs explode up, shooting elbow under ball (90°)
          // 0.45 peak / lift  — full extension, elbow above forehead
          // 0.55 RELEASE      — wrist begins snap (forearm extends past straight)
          // 0.70 GOOSENECK    — wrist flicks DOWN, fingers point at floor,
          //                     guide hand drops away (Kobe signature hold)
          // 0.85 descent      — legs prep to absorb landing
          // 1.0  landing      — soft knees, return to base
          const jumpShotClip = buildClip('jumpshot', 1.0, [
            quatTrack(B.upLegL, [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.45,0,0], [-0.55,0,0], [-0.1,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.upLegR, [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.45,0,0], [-0.55,0,0], [-0.1,0,0], [-0.05,0,0], [-0.35,0,0], [0,0,0]]),
            quatTrack(B.legL,   [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [0.9,0,0], [0.7,0,0], [0.05,0,0], [0.05,0,0], [0.65,0,0], [0,0,0]]),
            quatTrack(B.legR,   [0, 0.15, 0.30, 0.45, 0.70, 0.85, 1.0],
              [[0,0,0], [0.9,0,0], [0.7,0,0], [0.05,0,0], [0.05,0,0], [0.65,0,0], [0,0,0]]),
            // Shooting arm — upper arm sweeps up to full extension; subtle
            // outward tilt during gooseneck hold so the arm doesn't read flat
            quatTrack(B.armR,   [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.4,0,0.05], [-1.7,0,0], [-2.55,0,0.02], [-2.7,0,0.05], [-2.62,0,0.12], [-1.1,0,0.05], [0,0,0]]),
            // Shooting forearm — 90° bend at gather (ball in pocket), unfolds
            // through peak, then OVER-EXTENDS slightly (positive X = wrist
            // drops below the line of the arm = gooseneck)
            quatTrack(B.forearmR, [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.5,0,0], [-1.05,0,0], [-0.55,0,0], [-0.15,0,0], [0.35,0,0], [0.15,0,0], [0,0,0]]),
            // Guide hand — supports ball on the way up, drops away at release
            // (left hand falls to chest level + slightly outward)
            quatTrack(B.armL,   [0, 0.15, 0.30, 0.45, 0.55, 0.70, 0.85, 1.0],
              [[0,0,0], [-0.35,0,0.25], [-0.95,0,0.3], [-1.3,0,0.28], [-0.95,0,0.22], [-0.4,0,0.18], [-0.15,0,0.1], [0,0,0]]),
            quatTrack(B.forearmL, [0, 0.15, 0.30, 0.45, 0.55, 0.70, 1.0],
              [[0,0,0], [-0.3,0,0], [-0.7,0,0], [-0.5,0,0], [-0.25,0,0], [-0.1,0,0], [0,0,0]]),
            // Spine — slight forward lean on gather, upright through release,
            // tiny backward lean during gooseneck (back arch hold)
            quatTrack(B.spine,  [0, 0.15, 0.30, 0.45, 0.55, 0.70, 1.0],
              [[0,0,0], [0.08,0,0], [0.02,0,0], [-0.05,0,0], [-0.08,0,0], [-0.04,0,0], [0,0,0]]),
            // Head — chin up at peak (eyes track ball through release), level
            // through gooseneck
            quatTrack(B.head,   [0, 0.30, 0.55, 0.70, 1.0],
              [[0,0,0], [-0.1,0,0], [-0.18,0,0], [-0.12,0,0], [0,0,0]]),
          ])

          // Phase 16.48 — convert authored clips to ADDITIVE blend mode so
          // they layer on top of the running base clip (idle/walk/run) rather
          // than replacing it. Previous bind*delta approach was mathematically
          // correct, but at clip start frame 0 = bindQuat = T-pose, so arms
          // SNAPPED to T-pose then stayed there if the deltas never visibly
          // applied. With makeClipAdditive: frame 0 becomes the reference
          // (identity contribution = base pose drives), middle frames are
          // deltas added on top. Played with AdditiveAnimationBlendMode, the
          // base layer (idle) keeps the arm in its natural sway position and
          // the authored shoot clip adds rotation on top — exactly what NBA2K
          // does and what every Mixamo retarget pipeline relies on.
          const authoredClips = [dunkClip, layupClip, fadeawayClip, reboundClip, blockClip, passClip, crossoverClip, pumpFakeClip, jabStepClip, jumpShotClip, defenseClip]
          for (const clip of authoredClips) {
            THREE.AnimationUtils.makeClipAdditive(clip)
          }
          const authoredKeys = new Set<string>(authoredClips.map(c => c.name.toLowerCase()))

          // Wire all custom clips into the clipMap. LoopOnce + clampWhenFinished
          // means the clip stops on its last frame (which is now identity-delta
          // = no contribution, so bone returns cleanly to base pose).
          const oneShotClips = [dunkClip, layupClip, fadeawayClip, reboundClip, blockClip, passClip, crossoverClip, pumpFakeClip, jabStepClip, jumpShotClip]
          for (const clip of oneShotClips) {
            const action = mixer.clipAction(clip)
            action.blendMode = THREE.AdditiveAnimationBlendMode
            action.setLoop(THREE.LoopOnce, 1)
            action.clampWhenFinished = true
            clipMap[clip.name.toLowerCase()] = action
          }
          // Defense loops while held — also additive so arms-wide stance lays
          // on top of idle without killing the locomotion base.
          const defenseAction = mixer.clipAction(defenseClip)
          defenseAction.blendMode = THREE.AdditiveAnimationBlendMode
          defenseAction.setLoop(THREE.LoopRepeat, Infinity)
          clipMap[defenseClip.name.toLowerCase()] = defenseAction

          // Start Idle
          const idleAction = clipMap['idle']
          if (idleAction) idleAction.play()
          // Phase 16.66 — Procedural shoot motion. Pre-resolve bone objects
          // so the per-frame tick can compose with the live bone quaternion
          // without doing a name lookup every frame.
          const shootBoneObjects: Record<string, THREE.Bone | null> = {
            armR: B.armR ? boneByName[B.armR] : null,
            armL: B.armL ? boneByName[B.armL] : null,
            forearmR: B.forearmR ? boneByName[B.forearmR] : null,
            forearmL: B.forearmL ? boneByName[B.forearmL] : null,
            upLegR: B.upLegR ? boneByName[B.upLegR] : null,
            upLegL: B.upLegL ? boneByName[B.upLegL] : null,
            legR: B.legR ? boneByName[B.legR] : null,
            legL: B.legL ? boneByName[B.legL] : null,
            spine: B.spine ? boneByName[B.spine] : null,
            head: B.head ? boneByName[B.head] : null,
          }
          const xbotState: any = {
            mixer,
            clips: clipMap,
            currentClip: 'idle',
            moveLockUntil: 0,
            defenseHeld: false,
            shoot: {
              active: false,
              startMs: 0,
              durationMs: 0,
              moveType: '',
              baseQuats: new Map<string, THREE.Quaternion>(),
            },
            shootBoneObjects,
          }
          // Phase 16.41 — Mixamo Xbot ships with 13 stock clips that are
          // already polished retargets: Idle, Walking, Running, Dance,
          // Death, Sitting, Standing, Jump, Yes, No, Wave, Punch, ThumbsUp.
          // Hand-rolled QuaternionKeyframeTrack pose authoring missed bone
          // axis conventions and rendered as frozen / broken poses. Now
          // every move routes to the closest stock clip — fluid motion
          // guaranteed because Mixamo authored them. Position state
          // machines (jumpState / moveState) still differentiate trajectory.
          // Phase 16.62 — SHOOTING moves now route to 'wave' (right arm raises
          // up to head height) instead of 'jump' (which raises the KNEE up
          // toward the ball, looking like a soccer kick on every shot). Wave
          // gives proper arm-up shooting form; the vertical leap still comes
          // from jumpState.peakY. Dunk + rebound + block stay on 'jump' since
          // they're vertical-leap-dominant gestures.
          const moveToStockClip: Record<string, string> = {
            'jumpshot':  'wave',
            'three':     'wave',
            'fadeaway':  'wave',
            'layup':     'wave',
            'dunk':      'jump',
            'rebound':   'jump',
            'block':     'wave',
            'pass':      'punch',
            'pumpfake':  'wave',
            'crossover': 'walking',
            'jabstep':   'walking',
            'defense':   'sitting',
          }
          // Phase 16.43 — moves that warrant a sneaker squeak on trigger
          // (any ground-direction-change or push-off — basically anything
          // that isn't a hold pose like defense)
          const SQUEAK_MOVES = new Set([
            'jumpshot', 'dunk', 'layup', 'fadeaway', 'rebound', 'block',
            'crossover', 'jabstep', 'pumpfake',
          ])
          // Phase 16.66 — Per-move bone deltas applied procedurally over
          // the move duration via a bell-curve envelope (env = 4t(1-t)).
          // Each entry is { boneKey: [eulerX, eulerY, eulerZ] at PEAK }.
          // Composed in LIVE frame as `bone.quaternion = baseQuat × delta`
          // where baseQuat is captured at the moment xbotState.play is
          // called (idle pose at that frame). This bypasses the bind-frame
          // composition trap that broke phases 16.42-16.64 — deltas are
          // applied in the bone's CURRENT local frame, not in the bind
          // frame, so rotations land where they're authored to land.
          // Phase 16.73 — Frank: "slam dunks or any shot in the paint is still
          // shot with knees". Root cause: the underlying Mixamo Wave clip
          // (which jumpshot/three/fadeaway route to via moveToStockClip)
          // animates the LEGS too. shoot deltas only overrode ARM bones, so
          // the mixer's wave-leg-motion bled through and read as a kicking
          // motion. Fix: add ZERO-rotation leg overrides on every shoot move
          // so the legs stay STATIC during the shot (planted feet, proper
          // shooting form). DUNK/LAYUP/REBOUND/BLOCK keep their authored
          // knee-tuck deltas — those are real basketball mechanics; we just
          // tone them DOWN so they read as jumping not kicking.
          const ROOT: [number, number, number] = [0, 0, 0]
          const SHOOT_DELTAS: Record<string, Record<string, [number, number, number]>> = {
            // Outside shots — legs locked planted, only upper body extends
            jumpshot:  { armR: [-2.4, 0, 0.05], forearmR: [-0.5, 0, 0], armL: [-0.9, 0, 0.25], spine: [-0.08, 0, 0], head: [-0.15, 0, 0], upLegR: ROOT, upLegL: ROOT, legR: ROOT, legL: ROOT },
            three:     { armR: [-2.5, 0, 0.05], forearmR: [-0.4, 0, 0], armL: [-0.95, 0, 0.25], spine: [-0.10, 0, 0], upLegR: ROOT, upLegL: ROOT, legR: ROOT, legL: ROOT },
            fadeaway:  { armR: [-2.4, 0, 0.05], forearmR: [-0.4, 0, 0], spine: [-0.45, 0, 0], head: [-0.25, 0, 0], upLegR: ROOT, upLegL: ROOT, legR: ROOT, legL: ROOT },
            // Layup — single right knee comes up (real form), left planted
            layup:     { armR: [-2.4, 0, 0.10], forearmR: [-0.2, 0, 0], armL: [-0.8, 0, 0.2], upLegR: [-0.7, 0, 0], legR: [0.55, 0, 0], upLegL: ROOT, legL: ROOT, spine: [-0.10, 0, 0] },
            // Dunk — both knees TUCKED (jump pose) but less exaggerated.
            // Reduced from -0.9/1.3 → -0.55/0.85 so it reads as jumping
            // not kicking.
            dunk:      { armR: [-2.7, 0, -0.15], armL: [-2.7, 0, 0.15], forearmR: [-0.25, 0, 0], forearmL: [-0.25, 0, 0], upLegR: [-0.55, 0, 0], upLegL: [-0.55, 0, 0], legR: [0.85, 0, 0], legL: [0.85, 0, 0], spine: [-0.12, 0, 0] },
            // Rebound — two-leg leap, also toned down from -0.8/1.2
            rebound:   { armR: [-2.7, 0, -0.2], armL: [-2.7, 0, 0.2], upLegR: [-0.50, 0, 0], upLegL: [-0.50, 0, 0], legR: [0.75, 0, 0], legL: [0.75, 0, 0] },
            // Block — vertical leap with arm up. Toned legs.
            block:     { armR: [-2.7, 0, -0.05], forearmR: [-0.15, 0, 0], upLegR: [-0.45, 0, 0], upLegL: [-0.45, 0, 0], legR: [0.65, 0, 0], legL: [0.65, 0, 0] },
            pass:      { armR: [-1.0, 0, -0.35], armL: [-1.0, 0, 0.35], forearmR: [-0.7, 0, 0], forearmL: [-0.7, 0, 0], upLegR: ROOT, upLegL: ROOT, legR: ROOT, legL: ROOT },
            crossover: { spine: [0, 0, 0.45], armR: [-0.4, -0.35, -0.35], armL: [-0.4, 0.35, 0.35] },
            pumpfake:  { armR: [-1.4, 0, 0], forearmR: [-0.55, 0, 0], armL: [-0.4, 0, 0.2], upLegR: ROOT, upLegL: ROOT, legR: ROOT, legL: ROOT },
            jabstep:   { upLegR: [-0.5, 0, 0], legR: [0.35, 0, 0], spine: [-0.15, 0, 0] },
          }
          xbotState.shootDeltas = SHOOT_DELTAS
          xbotState.play = (clipName: string, durationMs: number) => {
            // Phase 16.66 — KICK OFF procedural shoot motion. Replaces the
            // Phase 16.65 stub (which left the player in idle). Now captures
            // the LIVE bone quaternions as the baseline at this exact frame,
            // then per-frame composes `bone.quaternion = base × delta(t)`
            // where delta(t) ramps from identity → peak → identity via a
            // bell curve. Math composes in the bone's LIVE local frame so
            // the same numeric rotation produces the visual result it
            // describes — no bind-frame axis assumption.
            const key = clipName.toLowerCase()
            const deltas = SHOOT_DELTAS[key]
            if (deltas) {
              const shoot = xbotState.shoot
              shoot.active = true
              shoot.startMs = performance.now()
              shoot.durationMs = durationMs
              shoot.moveType = key
              shoot.baseQuats.clear()
              for (const boneKey of Object.keys(deltas)) {
                const bone = xbotState.shootBoneObjects[boneKey]
                if (bone) shoot.baseQuats.set(boneKey, bone.quaternion.clone())
              }
            }
            xbotState.moveLockUntil = performance.now() + durationMs
            if (SQUEAK_MOVES.has(key)) playSqueak()
          }
          // Phase 16.65 — finished-handler is also a no-op now (we never
          // start a non-idle action, so nothing fires "finished"). Kept
          // as a safety net in case a future hot-path re-enables clips.
          mixer.addEventListener('finished', (ev: any) => {
            const finishedAction = ev.action as THREE.AnimationAction | undefined
            if (!finishedAction) return
            const idleAction = clipMap['idle']
            if (!idleAction || finishedAction === idleAction) return
            finishedAction.fadeOut(0.18)
            if (!idleAction.isRunning()) idleAction.reset().setEffectiveWeight(1).play()
            xbotState.currentClip = 'idle'
            xbotState.moveLockUntil = 0
          })
          ;(avatarHolder.userData as any).xbot = xbotState

          // Phase 16.60 — CLONE XBOT FOR DEFENDER. The primitive-humanoid
          // defender from Phase 16.55 was visually static (no walk cycle, no
          // limb motion). Cloning the rigged XBot gives the defender real
          // Mixamo locomotion. SkeletonUtils.clone() shares geometry but
          // forks the skeleton so each model has independent bone state.
          const defRef = (scene.userData as any).defender
          if (defRef?.group && isBasketballGallery) {
            // Tear down primitive defender meshes
            while (defRef.group.children.length > 0) {
              const c = defRef.group.children[0]
              defRef.group.remove(c)
              if ((c as any).geometry) (c as any).geometry.dispose()
              if ((c as any).material) {
                const m = (c as any).material
                if (Array.isArray(m)) m.forEach((mm: any) => mm.dispose())
                else m.dispose()
              }
            }
            // Phase 16.67 — clone the DEFENDER from XBot directly (NOT
            // from the player model). When the player loads a custom GLB,
            // we don't want their custom look duplicated on the opponent.
            // animSourceGltf.scene is XBot when isCustomModel; same as
            // modelGltf when not. Either way: defender = XBot.
            const defSource: THREE.Object3D = animSourceGltf.scene
            const defModel: THREE.Object3D = cloneSkinnedMesh(defSource)
            // Match player scale so they read at the same size on court
            defModel.scale.copy(model.scale)
            // Phase 16.61 — Mixamo +Z convention, no flip needed
            // Tint to red jersey + dark skin for visual contrast
            defModel.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.castShadow = true
                obj.receiveShadow = true
                if (obj.material) {
                  const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material
                  const mClone = mat.clone()
                  const name = (obj.name || '').toLowerCase()
                  if (name.includes('beta_surface') || name.includes('beta_joints') || name.includes('body')) {
                    // Jersey areas → red
                    mClone.color = new THREE.Color('#dc2626')
                  } else {
                    // Skin / hair / shoes → darker default
                    if (mClone.color) mClone.color.multiplyScalar(0.85)
                  }
                  obj.material = mClone
                }
              }
            })
            defRef.group.add(defModel)
            // Defender mixer + clip map
            const defMixer = new THREE.AnimationMixer(defModel)
            const defClips: Record<string, THREE.AnimationAction> = {}
            // Phase 16.67 — defender's animation source is XBot. No
            // retargeting needed since defender mesh IS the XBot clone.
            for (const clip of (animSourceGltf.animations || [])) {
              defClips[clip.name.toLowerCase()] = defMixer.clipAction(clip)
            }
            const defIdle = defClips['idle']
            if (defIdle) defIdle.play()
            defRef.mixer = defMixer
            defRef.clips = defClips
            defRef.currentClip = 'idle'
            // 'D' badge above the defender's head so player can still tell
            // them apart at a glance after the model swap
            const badgeCanvas = document.createElement('canvas')
            badgeCanvas.width = 128; badgeCanvas.height = 128
            const bctx = badgeCanvas.getContext('2d')!
            bctx.fillStyle = 'rgba(0,0,0,0.7)'
            bctx.beginPath(); bctx.arc(64, 64, 56, 0, Math.PI * 2); bctx.fill()
            bctx.fillStyle = '#dc2626'
            bctx.font = 'bold 90px monospace'
            bctx.textAlign = 'center'
            bctx.fillText('D', 64, 96)
            const badgeTex = new THREE.CanvasTexture(badgeCanvas)
            const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false }))
            badgeSprite.scale.set(0.5, 0.5, 0.5)
            badgeSprite.position.set(0, 2.4, 0)
            defRef.group.add(badgeSprite)
          }
          console.log('[GalleryRoom3D] player loaded', {
            customModel: isCustomModel,
            stock: (animSourceGltf.animations || []).map((c: any) => c.name),
            authored: oneShotClips.map(c => c.name).concat([defenseClip.name]),
          })
      }
      // Phase 16.67 — top-level loader logic. If user has a rigged GLB,
      // load both in parallel and pass them separately. If they have a
      // GLB but it's static (TripoSR — no skeleton), animations can't
      // bind so fall back to XBot. If user has nothing, just load XBot
      // and use it for everything.
      if (probeGlb) {
        Promise.all([loadGltf(probeGlb), loadGltf(XBOT_URL)])
          .then(([userGltf, xbotGltf]: any[]) => {
            if (!hasSkin(userGltf.scene)) {
              console.warn('[GalleryRoom3D] custom GLB has no skeleton — using XBot')
              proceed(xbotGltf, xbotGltf, false)
              return
            }
            proceed(userGltf, xbotGltf, true)
          })
          .catch((err) => {
            console.error('[GalleryRoom3D] custom avatar load failed, falling back to XBot:', err)
            loadGltf(XBOT_URL)
              .then((g: any) => proceed(g, g, false))
              .catch((err2: any) => {
                console.error('[GalleryRoom3D] XBot load failed too, falling back to humanoid:', err2)
                buildCapsule({ bodyColor: '#dc2626' } as CharacterConfig)
              })
          })
      } else {
        loadGltf(XBOT_URL)
          .then((g: any) => proceed(g, g, false))
          .catch((err: any) => {
            console.error('[GalleryRoom3D] XBot load failed, falling back to humanoid:', err)
            buildCapsule({ bodyColor: '#dc2626' } as CharacterConfig)
          })
      }
    }

    const buildAvatar = (character: CharacterConfig) => {
      // Tear down old meshes first + stop any animation mixer
      const oldXbot = (avatarHolder.userData as any).xbot
      if (oldXbot?.mixer) {
        oldXbot.mixer.stopAllAction()
      }
      ;(avatarHolder.userData as any).xbot = null
      ;(avatarHolder.userData as any).limbs = null
      while (avatarHolder.children.length > 0) {
        const child = avatarHolder.children[0]
        avatarHolder.remove(child)
        if ((child as any).geometry) (child as any).geometry.dispose()
        if ((child as any).material) {
          const mat = (child as any).material
          if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose())
          else mat.dispose()
        }
      }
      const glbUrl = (character as any).aiGlbUrl || character.humanGlbUrl
      // Phase 16.75 — sports themes (gym + blacktop) now respect the user's
      // CHARACTER DESIGNER mesh (aiGlbUrl) when one is saved. Falls back to
      // XBot ONLY when no custom character exists. Per Frank: "remove the
      // robot looking players in gym, i want to be able to create a
      // character and use it in the gym".
      if (isSportsTheme && !glbUrl) {
        buildXBotPlayer()
        return
      }
      const isGlbAvatar = !!glbUrl
      console.log('[GalleryRoom3D] character', {
        type: character.type,
        hasAiGlb: !!(character as any).aiGlbUrl,
        hasHumanGlb: !!character.humanGlbUrl,
        sportsTheme: isSportsTheme,
        willLoadGlb: isGlbAvatar,
      })
      if (isGlbAvatar) {
        const loader = new GLTFLoader()
        loader.load(
          glbUrl!,
          (gltf) => {
            const model = gltf.scene
            const baseScale = character.humanScale ?? 1
            const heightMul = character.height ?? 1
            const preBox = new THREE.Box3().setFromObject(model)
            const preSize = new THREE.Vector3(); preBox.getSize(preSize)
            if (preSize.y > 0 && (preSize.y < 0.5 || preSize.y > 4)) {
              const autoScale = 1.8 / preSize.y
              model.scale.setScalar(autoScale * heightMul)
            } else {
              model.scale.setScalar(baseScale * heightMul)
            }
            const box = new THREE.Box3().setFromObject(model)
            const center = new THREE.Vector3(); box.getCenter(center)
            model.position.x -= center.x
            model.position.z -= center.z
            model.position.y = (character.humanYOffset ?? 0) - box.min.y
            model.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.castShadow = true
                obj.receiveShadow = true
              }
            })
            avatarHolder.add(model)
            console.log('[GalleryRoom3D] GLB loaded + auto-scaled')
          },
          undefined,
          (err) => {
            console.error('[GalleryRoom3D] character GLB load failed, falling back to capsule:', err)
            buildCapsule(character)
          }
        )
      } else {
        buildCapsule(character)
      }
    }

    const buildCapsule = (character: CharacterConfig) => {
      // Phase 16.39 — humanoid built from primitives WITH joint groups so the
      // animate loop can rotate each limb around hip/shoulder for a walk cycle.
      // Each leg/arm is a Group at the joint; the limb meshes hang underneath
      // so rotation.x on the group swings the whole limb from the joint.
      const skinTone = (character as any).skinColor || 0xd4a373
      const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.7, metalness: 0.05 })
      const jersey = new THREE.MeshStandardMaterial({
        color: character.bodyColor || themeCfg.accent,
        emissive: character.glowColor || themeCfg.accent,
        emissiveIntensity: (character.glowIntensity ?? 0.2) * 0.4,
        roughness: 0.6, metalness: 0.1,
      })
      const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.05 })
      const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 })
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })

      // Head + hair
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin)
      head.position.set(0, 1.86, 0); head.castShadow = true
      avatarHolder.add(head)
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat)
      hair.position.set(0, 1.88, 0); hair.castShadow = true
      avatarHolder.add(hair)

      // Torso (jersey)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.28), jersey)
      torso.position.set(0, 1.4, 0); torso.castShadow = true
      avatarHolder.add(torso)

      // Hips / shorts
      const hips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.3), shortsMat)
      hips.position.set(0, 1.0, 0); hips.castShadow = true
      avatarHolder.add(hips)

      // Arms — wrapped in shoulder Groups so they can swing
      const armGroups: THREE.Group[] = []
      for (const xSign of [-1, 1]) {
        const shoulderGroup = new THREE.Group()
        shoulderGroup.position.set(xSign * 0.32, 1.6, 0)
        const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), skin)
        upperArm.position.set(0, -0.18, 0); upperArm.castShadow = true
        shoulderGroup.add(upperArm)
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 4, 8), skin)
        forearm.position.set(0, -0.5, 0); forearm.castShadow = true
        shoulderGroup.add(forearm)
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), skin)
        hand.position.set(0, -0.72, 0); hand.castShadow = true
        shoulderGroup.add(hand)
        avatarHolder.add(shoulderGroup)
        armGroups.push(shoulderGroup)
      }

      // Legs — wrapped in hip Groups so they can swing
      const legGroups: THREE.Group[] = []
      for (const xSign of [-1, 1]) {
        const hipGroup = new THREE.Group()
        hipGroup.position.set(xSign * 0.12, 1.0, 0)
        const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.36, 4, 8), skin)
        upperLeg.position.set(0, -0.32, 0); upperLeg.castShadow = true
        hipGroup.add(upperLeg)
        const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.36, 4, 8), skin)
        lowerLeg.position.set(0, -0.76, 0); lowerLeg.castShadow = true
        hipGroup.add(lowerLeg)
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.32), sneakerMat)
        shoe.position.set(0, -0.96, 0.04); shoe.castShadow = true
        hipGroup.add(shoe)
        avatarHolder.add(hipGroup)
        legGroups.push(hipGroup)
      }

      // Expose limbs to the animate loop for walk-cycle animation
      ;(avatarHolder.userData as any).limbs = {
        legL: legGroups[0], legR: legGroups[1],
        armL: armGroups[0], armR: armGroups[1],
        head, hair, torso, hips,
      }
    }

    // Initial avatar build from saved character
    buildAvatar(getStoredCharacter())

    // Phase 16.47 — WebRTC 1-on-1 multiplayer setup. Remote player renders
    // as a tinted capsule humanoid (XBot + animation sync deferred to v2).
    // State sync at 15Hz drives remote position/rotation. Events (shot,
    // score, cheer) flow via the reliable event channel.
    if (isSportsTheme) {
      const remoteAvatarHolder = new THREE.Group()
      remoteAvatarHolder.visible = false
      scene.add(remoteAvatarHolder)

      const buildRemoteCapsule = (profile: CharacterConfig | null | undefined, handle: string) => {
        // Clear old
        while (remoteAvatarHolder.children.length > 0) {
          const c = remoteAvatarHolder.children[0]
          remoteAvatarHolder.remove(c)
          if ((c as any).geometry) (c as any).geometry.dispose()
          if ((c as any).material) {
            const m = (c as any).material
            if (Array.isArray(m)) m.forEach((x: any) => x.dispose()); else m.dispose()
          }
        }
        const p = profile || ({} as CharacterConfig)
        const skinHex = (p as any).face?.skinTone || (p as any).skinColor || '#d4a373'
        const bodyHex = p.bodyColor || '#3b82f6'
        const skin = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 })
        const jersey = new THREE.MeshStandardMaterial({
          color: bodyHex,
          emissive: new THREE.Color(bodyHex),
          emissiveIntensity: 0.08,
          roughness: 0.6,
        })
        const shorts = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
        const shoes = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        // Head + crude hair
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin)
        head.position.set(0, 1.86, 0); head.castShadow = true
        remoteAvatarHolder.add(head)
        const hairColor = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2),
          hairColor,
        )
        hair.position.set(0, 1.88, 0); hair.castShadow = true
        remoteAvatarHolder.add(hair)
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.28), jersey)
        torso.position.set(0, 1.4, 0); torso.castShadow = true
        remoteAvatarHolder.add(torso)
        // Hips
        const hips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.3), shorts)
        hips.position.set(0, 1.0, 0); hips.castShadow = true
        remoteAvatarHolder.add(hips)
        // Arms (static, no animation in v1)
        for (const xs of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.6, 4, 8), skin)
          arm.position.set(xs * 0.32, 1.3, 0); arm.castShadow = true
          remoteAvatarHolder.add(arm)
        }
        // Legs
        for (const xs of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), skin)
          leg.position.set(xs * 0.12, 0.45, 0); leg.castShadow = true
          remoteAvatarHolder.add(leg)
          const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.32), shoes)
          shoe.position.set(xs * 0.12, 0.0, 0.04); shoe.castShadow = true
          remoteAvatarHolder.add(shoe)
        }
        // Handle label above head (sprite from canvas)
        const labelCanvas = document.createElement('canvas')
        labelCanvas.width = 256; labelCanvas.height = 64
        const lctx = labelCanvas.getContext('2d')!
        lctx.fillStyle = 'rgba(0,0,0,0.7)'; lctx.fillRect(0, 0, 256, 64)
        lctx.strokeStyle = bodyHex; lctx.lineWidth = 4; lctx.strokeRect(2, 2, 252, 60)
        lctx.fillStyle = '#ffffff'; lctx.font = 'bold 32px monospace'; lctx.textAlign = 'center'
        lctx.fillText(handle.slice(0, 12), 128, 42)
        const labelTex = new THREE.CanvasTexture(labelCanvas)
        const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true })
        const label = new THREE.Sprite(labelMat)
        label.scale.set(1.2, 0.3, 1)
        label.position.set(0, 2.3, 0)
        remoteAvatarHolder.add(label)
        remoteAvatarHolder.visible = true
      }

      ;(scene.userData as any).buildRemoteCapsule = buildRemoteCapsule
      ;(scene.userData as any).remoteAvatarHolder = remoteAvatarHolder
    }

    // Phase 16.28 — listen for character-updated events fired by
    // CharacterDesigner.saveCharacter(). Lets users design + save in another
    // tab (or the designer modal) and see the gallery3d avatar swap live.
    const onCharacterUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as CharacterConfig | undefined
      if (detail) buildAvatar(detail)
      else buildAvatar(getStoredCharacter())
    }
    window.addEventListener('character-updated', onCharacterUpdated)
    // Cross-tab updates via storage event
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'soundchain_character') buildAvatar(getStoredCharacter())
    }
    window.addEventListener('storage', onStorageChange)

    // ─── Movement ────────────────────────────────────────────
    const keys: Record<string, boolean> = {}
    // Ignore key events when a form field is focused — fixes city search input
    // that couldn't accept typing because WASD was triggering movement instead
    // of letting characters land in the input.
    const isTypingInForm = (target: EventTarget | null) => {
      if (!target || !(target as HTMLElement).tagName) return false
      const tag = (target as HTMLElement).tagName
      const editable = (target as HTMLElement).isContentEditable
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInForm(e.target)) return
      // Phase 16.64 — Tab cycles NBA 2K-style camera presets. Tab (not 'C')
      // so the binding doesn't collide with crossover ('c'). preventDefault
      // keeps Tab from blurring focus to the next form element.
      if (e.key === 'Tab') {
        e.preventDefault()
        const idx = CAMERA_PRESETS.indexOf(cameraPresetRef.current)
        const next = CAMERA_PRESETS[(idx + 1) % CAMERA_PRESETS.length]
        setCameraPreset(next)
        return
      }
      const k = e.key.toLowerCase()
      keys[k] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingInForm(e.target)) return
      keys[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ─── 360° Camera Yaw — mouse/touch drag rotates the view ──
    // Phase 16.21 — Frank wants "full panoramic view 360". Drag horizontally
    // on the canvas to rotate the camera around the character. Vertical drag
    // tilts (pitch) within sensible bounds. Works on desktop + touch.
    let cameraYaw = 0  // radians around Y axis
    let cameraPitch = 0.05  // small upward tilt by default
    let dragging = false
    let lastX = 0, lastY = 0
    const onPointerDown = (e: PointerEvent) => {
      // Only start drag on the canvas itself, not HUD elements above it
      if (e.target !== renderer.domElement) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      try { renderer.domElement.setPointerCapture(e.pointerId) } catch {}
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      cameraYaw -= dx * 0.008
      cameraPitch = Math.max(-0.3, Math.min(0.6, cameraPitch + dy * 0.005))
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      try { renderer.domElement.releasePointerCapture(e.pointerId) } catch {}
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    // ─── Click frame → open detail modal ─────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onClick = (event: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      let cx: number, cy: number
      if ('touches' in event) {
        if (!event.touches[0]) return
        cx = event.touches[0].clientX; cy = event.touches[0].clientY
      } else {
        cx = event.clientX; cy = event.clientY
      }
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(frameMeshes.map(fm => fm.group), true)
      if (hits.length > 0) {
        for (const hit of hits) {
          const data = (hit.object.userData?.track || hit.object.parent?.children?.find(c => (c as any).userData?.track)?.userData?.track) as Track | undefined
          if (data) {
            setSelectedTrack(data)
            return
          }
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('touchend', onClick as any)

    // ─── Resize ──────────────────────────────────────────────
    const onResize = () => {
      const cw = container.clientWidth || window.innerWidth
      const ch = container.clientHeight || window.innerHeight - 200
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
      // Phase 16.66 — keep composer + bloom pass in sync with viewport
      composer.setSize(cw, ch)
      bloomPass.resolution.set(cw, ch)
    }
    window.addEventListener('resize', onResize)
    const fitTimer = setTimeout(onResize, 200)

    // ─── Placed Furniture (procedural Three.js geometry) ───────
    placedFurniture.forEach(pf => {
      const item = getFurnitureById(pf.itemId)
      if (!item) return
      const color = new THREE.Color(pf.color)
      const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.7 })

      let mesh: THREE.Mesh
      if (item.category === 'rugs') {
        // Flat plane for rugs
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(item.width, item.depth), mat)
        mesh.rotation.x = -Math.PI / 2
      } else if (item.category === 'plants') {
        // Cylinder trunk + sphere foliage
        const group = new THREE.Group()
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, item.height * 0.4, 8), new THREE.MeshStandardMaterial({ color: '#5c4033' }))
        trunk.position.y = item.height * 0.2
        group.add(trunk)
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(item.width * 0.8, 12, 12), mat)
        foliage.position.y = item.height * 0.6
        group.add(foliage)
        // Pot
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.25, 8), new THREE.MeshStandardMaterial({ color: '#8b4513' }))
        pot.position.y = 0.125
        group.add(pot)
        group.position.set(pf.x, item.yOffset, pf.z)
        group.rotation.y = pf.rotation
        scene.add(group)
        return
      } else if (item.category === 'lighting' && item.id === 'neon-sign') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(item.width, item.height, item.depth),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }))
      } else {
        // Default: box geometry
        mesh = new THREE.Mesh(new THREE.BoxGeometry(item.width, item.height, item.depth), mat)
      }
      mesh.position.set(pf.x, item.yOffset + item.height / 2, pf.z)
      mesh.rotation.y = pf.rotation
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    })

    // Track gamepad A-button "fired" edge so holding doesn't auto-spam shots
    const ballState_aHeld = { fired: false }

    // Phase 16.39 — NBA2K-style move state machine.
    // While a move is active, it OWNS player position/rotation (WASD is gated
    // off below). Each move ticks dt forward from t=0 until duration, then
    // releases the player back to normal control.
    type MoveKind = 'crossover' | 'spin' | 'pumpFake' | 'jabStep'
    const moveState = {
      type: null as null | MoveKind,
      t: 0,
      duration: 0,
      startX: 0, startZ: 0, startY: 0, startRotY: 0,
      facingX: 0, facingZ: 0,
      sideX: 0, sideZ: 0,
      crossDir: 1,
    }
    const triggerMove = (type: MoveKind) => {
      if (moveState.type) return
      const ballRef = (scene.userData as any).ball
      // Don't allow moves while a shot is in flight or mid-jump
      const jumpState = (scene.userData as any).jumpState
      if (jumpState?.active) return
      if (ballRef && !ballRef.ballState.held) return
      const rot = playerGroup.rotation.y
      moveState.type = type
      moveState.t = 0
      moveState.startX = playerGroup.position.x
      moveState.startZ = playerGroup.position.z
      moveState.startY = playerGroup.position.y
      moveState.startRotY = rot
      moveState.facingX = Math.sin(rot)
      moveState.facingZ = Math.cos(rot)
      moveState.sideX = Math.cos(rot)
      moveState.sideZ = -Math.sin(rot)
      if (type === 'crossover') {
        moveState.duration = 0.4
        moveState.crossDir = Math.random() < 0.5 ? -1 : 1
      } else if (type === 'spin') {
        moveState.duration = 0.55
      } else if (type === 'pumpFake') {
        moveState.duration = 0.35
      } else if (type === 'jabStep') {
        moveState.duration = 0.28
      }
      // Phase 16.41 — play matching XBot body clip if rigged avatar is loaded
      const xb2 = (avatarHolder.userData as any).xbot
      if (xb2?.play) {
        if (type === 'crossover') xb2.play('crossover', 400)
        else if (type === 'pumpFake') xb2.play('pumpFake', 350)
        else if (type === 'jabStep') xb2.play('jabStep', 280)
        // 'spin' uses playerGroup.rotation.y so no clip needed
      }
      // Phase 16.51 — play-by-play call for signature moves
      if (type === 'crossover' || type === 'spin') announceMove(type)
    }
    ;(scene.userData as any).triggerMove = triggerMove

    // Phase 16.47 — multiplayer connection setup. Exposed via scene.userData
    // so the lobby UI (React JSX) can call into the 3D scene to start a
    // host or guest connection. Closing the peer cleans up the remote
    // avatar holder and resets to solo mode.
    const teardownPeer = () => {
      const cur = peerRef.current
      if (cur) {
        try { cur.close() } catch {}
        peerRef.current = null
      }
      const rh = (scene.userData as any).remoteAvatarHolder as THREE.Group | undefined
      if (rh) rh.visible = false
      remoteAvatarRef.current = null
      setMpMode('solo')
      setMpRoomCode('')
      setMpRemoteHandle('Player 2')
    }
    ;(scene.userData as any).teardownPeer = teardownPeer

    const onRemoteState = (msg: GymStateMsg) => {
      const rh = (scene.userData as any).remoteAvatarHolder as THREE.Group | undefined
      if (!rh) return
      rh.position.set(msg.pos[0], msg.pos[1], msg.pos[2])
      rh.rotation.y = msg.rot
      if (remoteAvatarRef.current) {
        remoteAvatarRef.current.lastState = msg
      }
    }

    const onRemoteEvent = (msg: GymEventMsg) => {
      if (msg.type === 'hello') {
        // Remote sent profile + handle → build their avatar
        const profile = msg.profile as CharacterConfig
        const handle = msg.handle || 'Player 2'
        const buildFn = (scene.userData as any).buildRemoteCapsule as
          | ((p: CharacterConfig | null, h: string) => void) | undefined
        if (buildFn) buildFn(profile, handle)
        setMpRemoteHandle(handle)
        if (remoteAvatarRef.current) {
          // already exists, just rebuild
        } else {
          const rh = (scene.userData as any).remoteAvatarHolder as THREE.Group
          remoteAvatarRef.current = { holder: rh, state: {}, lastState: undefined }
        }
      } else if (msg.type === 'score') {
        // Remote scored → crowd cheers on our side too
        const crowd = (scene.userData as any).crowd
        if (crowd?.cheer) crowd.cheer()
      } else if (msg.type === 'crowdCheer') {
        const crowd = (scene.userData as any).crowd
        if (crowd?.cheer) crowd.cheer()
      } else if (msg.type === 'bye') {
        teardownPeer()
        try { toast.info('Opponent disconnected — back to solo') } catch {}
      }
    }

    const wirePeerHooks = (peer: GymPeer) => {
      peerRef.current = peer
      setMpRoomCode(peer.code)
      setMpRemoteHandle(peer.remoteHandle || 'Player 2')
      // Immediately fire hello so remote builds our avatar
      const me = getStoredCharacter()
      const myHandle = (me as any).name || 'Player 1'
      peer.sendEvent({ type: 'hello', profile: me, handle: myHandle })
      // If remote profile is already known (guest case via join response),
      // build their avatar right away
      if (peer.remoteProfile) {
        const buildFn = (scene.userData as any).buildRemoteCapsule as
          | ((p: CharacterConfig | null, h: string) => void) | undefined
        if (buildFn) buildFn(peer.remoteProfile as CharacterConfig, peer.remoteHandle || 'Player 2')
        const rh = (scene.userData as any).remoteAvatarHolder as THREE.Group
        remoteAvatarRef.current = { holder: rh, state: {}, lastState: undefined }
      }
    }

    ;(scene.userData as any).startMultiplayerHost = async () => {
      try {
        setMpError('')
        setMpMode('host-waiting')
        const me = getStoredCharacter()
        const myHandle = (me as any).name || 'Player 1'
        const peer = await connectAsHost(
          {
            onStateMsg: onRemoteState,
            onEventMsg: onRemoteEvent,
            onOpen: () => { setMpMode('connected'); try { toast.success('Player 2 connected!') } catch {} },
            onClose: () => { teardownPeer(); try { toast.info('Connection lost') } catch {} },
          },
          { profile: me, handle: myHandle },
        )
        wirePeerHooks(peer)
      } catch (err) {
        const msg = (err as Error).message || 'Connection failed'
        setMpError(msg)
        setMpMode('lobby')
      }
    }

    ;(scene.userData as any).startMultiplayerGuest = async (code: string) => {
      try {
        setMpError('')
        setMpMode('guest-joining')
        const me = getStoredCharacter()
        const myHandle = (me as any).name || 'Player 2'
        const peer = await connectAsGuest(
          code,
          {
            onStateMsg: onRemoteState,
            onEventMsg: onRemoteEvent,
            onOpen: () => { setMpMode('connected'); try { toast.success(`Joined ${peer.remoteHandle}!`) } catch {} },
            onClose: () => { teardownPeer(); try { toast.info('Connection lost') } catch {} },
          },
          { profile: me, handle: myHandle },
        )
        wirePeerHooks(peer)
      } catch (err) {
        const msg = (err as Error).message || 'Join failed'
        setMpError(msg)
        setMpMode('lobby')
      }
    }

    // ─── Animation Loop ──────────────────────────────────────
    // Phase 16.24 — SPEED is now in units PER SECOND, not per-frame. Frame-rate
    // independent movement so character walks the same pace at 60fps (empty
    // room) vs 15fps (city theme with all the brick textures, billboards,
    // streetlamps, and basketball court grinding GPU). Old SPEED 0.18/frame
    // at 60fps = 10.8 u/sec — match that as the baseline, bump slightly for
    // a snappier feel since the gallery is large.
    // Phase 16.39 — sports courts get NBA2K-like sprint feel; bounds stay
    // inside the court geometry so dunks register and player can't run off.
    const SPEED = theme === 'city' ? 18 : (theme === 'gym' || theme === 'blacktop') ? 14 : 12
    // Phase 16.75 — NBA-spec player bounds:
    //   Gym full-court: 28m long × 15m wide; half-dims = (7.5w, 14L). Allow
    //   player to roam INSIDE both sidelines + baselines with 0.5m buffer.
    //   Blacktop half-court: 15m square. Half-dim = 7.5 each axis.
    // Use asymmetric bounds so the X-axis (width) doesn't get over-constrained
    // and the Z-axis (length) reaches all the way from rim to rim.
    const PLAYER_BOUNDS_X = theme === 'city' ? 95 : theme === 'gym' ? 7.0 : theme === 'blacktop' ? 7.0 : 19
    const PLAYER_BOUNDS_Z = theme === 'city' ? 95 : theme === 'gym' ? 13.5 : theme === 'blacktop' ? 7.0 : 19
    const PLAYER_BOUNDS = PLAYER_BOUNDS_X  // backwards-compat alias
    let lastFrame = performance.now()
    let frameCount = 0
    let fpsLastUpdate = lastFrame
    let rafId = 0

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const now = performance.now()
      const dtSec = Math.min(0.1, (now - lastFrame) / 1000)  // clamp 100ms to avoid huge jumps after tab-switch
      lastFrame = now
      frameCount++
      if (now - fpsLastUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (now - fpsLastUpdate))
        setStats({ fps, frames: frameMeshes.length, position: `x:${playerGroup.position.x.toFixed(1)} z:${playerGroup.position.z.toFixed(1)}` })
        frameCount = 0
        fpsLastUpdate = now
      }

      // Movement (with bounds) — keyboard OR gamepad (Phase 16.13)
      const fwd = (keys['w'] || keys['arrowup']) ? 1 : 0
      const back = (keys['s'] || keys['arrowdown']) ? 1 : 0
      const left = (keys['a'] || keys['arrowleft']) ? 1 : 0
      const right = (keys['d'] || keys['arrowright']) ? 1 : 0
      // Gamepad input — left stick for movement, dpad as fallback.
      // navigator.getGamepads() returns null entries for disconnected slots;
      // poll the first connected pad. Deadzone 0.15 to ignore stick drift.
      let gpX = 0, gpY = 0
      try {
        const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : []
        for (let pi = 0; pi < pads.length; pi++) {
          const p = pads[pi]
          if (!p) continue
          const sx = p.axes[0] || 0
          const sy = p.axes[1] || 0
          if (Math.abs(sx) > 0.15) gpX = sx
          if (Math.abs(sy) > 0.15) gpY = sy
          // D-pad buttons 12-15 (up/down/left/right) as fallback
          if (p.buttons[12]?.pressed) gpY = -1
          if (p.buttons[13]?.pressed) gpY = 1
          if (p.buttons[14]?.pressed) gpX = -1
          if (p.buttons[15]?.pressed) gpX = 1
          if (gpX !== 0 || gpY !== 0) {
            if (!gamepadConnectedRef.current) {
              gamepadConnectedRef.current = true
              setGamepadConnected(true)
            }
            break
          }
        }
      } catch {}
      // Combine keyboard + gamepad; gamepad axes are analog (-1..1) so they
      // can express finer movement than binary keys.
      // Phase 16.24 — input is now CAMERA-RELATIVE: W = forward in the
      // direction the camera is looking (not world -Z). Press W with camera
      // facing east, character walks east. Matches NBA2K/GTA player feel.
      const rawX = (right - left) + gpX
      const rawZ = -(fwd - back) + gpY
      const mag = Math.min(1, Math.hypot(rawX, rawZ))
      let dirX = 0, dirZ = 0
      if (mag > 0.001) {
        const norm = Math.hypot(rawX, rawZ)
        // Local stick direction (in screen/camera space)
        const localX = rawX / norm
        const localZ = rawZ / norm
        // Rotate by camera yaw to convert to world space
        const cosY = Math.cos(cameraYaw)
        const sinY = Math.sin(cameraYaw)
        dirX = localX * cosY + localZ * sinY
        dirZ = -localX * sinY + localZ * cosY
      }
      // Phase 16.39 — Move tick. If a NBA2K-style move is active, it OWNS
      // position/rotation for its duration; WASD is gated below.
      if (moveState.type) {
        moveState.t += dtSec
        const u = Math.min(1, moveState.t / moveState.duration)
        if (moveState.type === 'crossover') {
          const lateral = Math.sin(u * Math.PI) * 1.5 * moveState.crossDir
          playerGroup.position.x = moveState.startX + moveState.sideX * lateral
          playerGroup.position.z = moveState.startZ + moveState.sideZ * lateral
        } else if (moveState.type === 'spin') {
          playerGroup.rotation.y = moveState.startRotY + u * Math.PI * 2
          const fwd = u * 1.4
          playerGroup.position.x = moveState.startX + moveState.facingX * fwd
          playerGroup.position.z = moveState.startZ + moveState.facingZ * fwd
        } else if (moveState.type === 'pumpFake') {
          const bounce = Math.sin(u * Math.PI) * 0.22
          playerGroup.position.y = moveState.startY + bounce
        } else if (moveState.type === 'jabStep') {
          const fwd = Math.sin(u * Math.PI) * 0.5
          playerGroup.position.x = moveState.startX + moveState.facingX * fwd
          playerGroup.position.z = moveState.startZ + moveState.facingZ * fwd
        }
        if (u >= 1) {
          if (moveState.type === 'pumpFake') playerGroup.position.y = moveState.startY
          if (moveState.type === 'spin') playerGroup.rotation.y = moveState.startRotY
          if (moveState.type === 'crossover' || moveState.type === 'jabStep') {
            playerGroup.position.x = moveState.startX
            playerGroup.position.z = moveState.startZ
          }
          moveState.type = null
        }
        playerGroup.position.x = Math.max(-PLAYER_BOUNDS_X, Math.min(PLAYER_BOUNDS_X, playerGroup.position.x))
        playerGroup.position.z = Math.max(-PLAYER_BOUNDS_Z, Math.min(PLAYER_BOUNDS_Z, playerGroup.position.z))
      } else {
        // Normal WASD/gamepad movement (only when no move is active)
        playerGroup.position.x += dirX * SPEED * mag * dtSec
        playerGroup.position.z += dirZ * SPEED * mag * dtSec
        playerGroup.position.x = Math.max(-PLAYER_BOUNDS_X, Math.min(PLAYER_BOUNDS_X, playerGroup.position.x))
        playerGroup.position.z = Math.max(-PLAYER_BOUNDS_Z, Math.min(PLAYER_BOUNDS_Z, playerGroup.position.z))
        if (mag > 0.05) {
          playerGroup.rotation.y = Math.atan2(dirX, dirZ)  // Phase 16.61 — +Z convention
        }
      }

      // Phase 16.40 — XBot AnimationMixer tick + clip cross-fade by speed.
      // Rigged avatar handles walk/run/idle natively; primitive limb swing
      // (below) only runs as fallback when the XBot fetch failed.
      const xbot = (avatarHolder.userData as any).xbot as {
        mixer: THREE.AnimationMixer
        clips: Record<string, THREE.AnimationAction>
        currentClip: string
        moveLockUntil: number
        defenseHeld: boolean
        play: (clipName: string, durationMs: number) => void
        // Phase 16.66 — Sarg's authored shoot delta state machine. Gated by
        // shoot.active so the other two fields are only accessed when set up.
        shoot?: { active: boolean; startMs: number; durationMs: number; moveType: string; baseQuats: Map<string, THREE.Quaternion> }
        shootDeltas: Record<string, Record<string, [number, number, number]>>
        shootBoneObjects: Record<string, THREE.Bone | null>
      } | null
      // Phase 16.44 — fan animation tick. Idle fans sway gently in place;
      // excited fans jump up + tilt slightly. InstancedMesh matrix update
      // per fan is cheap (just a Matrix4.compose). Total work: ~112 fans
      // × small compose = sub-1ms even on Sarg.
      const crowd = (scene.userData as any).crowd
      if (crowd && crowd.fanArray) {
        const t = now / 1000  // seconds for sin period
        const axisX = crowd.axisX as THREE.Vector3
        for (let i = 0; i < crowd.fanArray.length; i++) {
          const f = crowd.fanArray[i]
          const excited = now < f.excitedUntil
          // Idle sway: gentle ~0.025u oscillation. Excited jump: |sin| up
          // to 0.42u with phase-offset so the crowd doesn't move in lockstep.
          const idleSway = Math.sin(t * 2.4 + f.phase) * 0.025
          const excitedJump = excited
            ? Math.abs(Math.sin((now - (f.excitedUntil - 1500)) * 0.008 + f.phase)) * 0.42
            : 0
          const targetY = idleSway + excitedJump
          f.jumpY = f.jumpY * 0.78 + targetY * 0.22
          const targetTilt = excited ? -0.18 + Math.sin(t * 8 + f.phase) * 0.06 : 0
          f.tilt = f.tilt * 0.85 + targetTilt * 0.15
          // Torso
          crowd.fanPos.set(f.baseX, f.baseY + f.jumpY, f.baseZ)
          crowd.fanQuat.setFromAxisAngle(axisX, f.tilt)
          crowd.fanMtx.compose(crowd.fanPos, crowd.fanQuat, crowd.fanScale)
          crowd.torsoMesh.setMatrixAt(i, crowd.fanMtx)
          // Head — sits above torso, tilts slightly more for life
          crowd.fanPos.set(f.baseX, f.baseY + 0.45 + f.jumpY, f.baseZ)
          crowd.fanQuat.setFromAxisAngle(axisX, f.tilt * 1.4)
          crowd.fanMtx.compose(crowd.fanPos, crowd.fanQuat, crowd.fanScale)
          crowd.headMesh.setMatrixAt(i, crowd.fanMtx)
        }
        crowd.torsoMesh.instanceMatrix.needsUpdate = true
        crowd.headMesh.instanceMatrix.needsUpdate = true
      }

      // Phase 16.47 — multiplayer broadcast tick. 15Hz cap so we don't
      // flood the data channel. Position + rotation + current animation
      // clip + ball-held flag = enough to drive remote avatar visualization.
      const peer = peerRef.current
      if (peer) {
        const mpLast = (scene.userData as any)._mpLastBroadcast || 0
        if (now - mpLast > 66) {
          ;(scene.userData as any)._mpLastBroadcast = now
          const pg = (scene.userData as any).playerGroupRef as THREE.Group | undefined
          const ballRef = (scene.userData as any).ball
          const xbotState = (avatarHolder.userData as any).xbot as { currentClip?: string } | undefined
          if (pg) {
            peer.sendState({
              pos: [pg.position.x, pg.position.y, pg.position.z],
              rot: pg.rotation.y,
              clip: xbotState?.currentClip || 'idle',
              ballHeld: !!ballRef?.ballState?.held,
              t: now,
            })
          }
        }
      }

      if (xbot?.mixer) {
        xbot.mixer.update(dtSec)
        // Phase 16.66 — Procedural shoot-motion overlay. Runs AFTER the
        // mixer has applied idle's keyframes for this frame, then OVERWRITES
        // the shoot-relevant bones with `baseQuat × delta(env)` where:
        //   env = 4t(1-t)  — bell curve, peaks at t=0.5
        //   baseQuat       — captured at xbotState.play call time (idle
        //                    pose at the moment shoot fired)
        //   delta          — quat from per-move Euler triplet × env so it
        //                    grows from identity → peak → identity
        // Composes in LIVE local frame. When t >= 1, deactivate so idle
        // resumes driving these bones via the mixer.
        const shoot = xbot.shoot
        if (shoot?.active) {
          const t = Math.min(1, (now - shoot.startMs) / shoot.durationMs)
          if (t >= 1) {
            shoot.active = false
          } else {
            const env = 4 * t * (1 - t)
            const deltas = xbot.shootDeltas?.[shoot.moveType]
            if (deltas) {
              const _se = new THREE.Euler()
              const _sq = new THREE.Quaternion()
              for (const boneKey in deltas) {
                const bone = xbot.shootBoneObjects[boneKey] as THREE.Bone | null
                if (!bone) continue
                const baseQ = shoot.baseQuats.get(boneKey)
                if (!baseQ) continue
                const [ex, ey, ez] = deltas[boneKey]
                _se.set(ex * env, ey * env, ez * env)
                _sq.setFromEuler(_se)
                bone.quaternion.copy(baseQ).multiply(_sq)
              }
            }
          }
        }
        // Phase 16.43 — ambient DRIBBLE cycle while ball is held + player
        // not airborne. ~0.55s cadence (typical pro dribble rate). Cuts
        // out during shooting moves so the audio doesn't compete with
        // the shot mechanic. Also fires the ball-bounce visual at the
        // same cadence so the ball reads as actively dribbled, not just
        // floating in the hand.
        const ballRef = (scene.userData as any).ball
        const jumpRef = (scene.userData as any).jumpState
        if (ballRef?.ballState?.held && !jumpRef?.active && now > xbot.moveLockUntil) {
          const dribbleState = (scene.userData as any).dribbleState || { t: 0 }
          ;(scene.userData as any).dribbleState = dribbleState
          dribbleState.t += dtSec
          // Visual bounce — ball oscillates between hip-height and floor-low
          // following |sin|. SFX fires once per period at the floor contact.
          const period = 0.55
          const phase = (dribbleState.t % period) / period
          const bounce = (1 - Math.abs(Math.sin(phase * Math.PI))) * 0.85  // 0.0 (floor) → 0.85 (hip)
          if (ballRef.ball) {
            const pg = (scene.userData as any).playerGroupRef
            // Ball lives in player's right-hand dribble zone: offset forward
            // + slightly to the right of player's facing direction.
            if (pg && ballRef.ball.position.y < 2.0 && ballRef.ball.position.y > -0.3) {
              const fwd = pg.rotation.y
              const offFwd = 0.45
              const offSide = 0.30
              ballRef.ball.position.x = pg.position.x + Math.sin(fwd) * offFwd + Math.cos(fwd) * offSide
              ballRef.ball.position.z = pg.position.z + Math.cos(fwd) * offFwd - Math.sin(fwd) * offSide
              ballRef.ball.position.y = pg.position.y + 0.2 + bounce
              ballRef.ball.rotation.x += dtSec * 6.0  // spinning while dribbled
            }
          }
          if (dribbleState.t >= period) {
            playDribble()
            dribbleState.t = dribbleState.t % period
          }
        } else if ((scene.userData as any).dribbleState) {
          ;(scene.userData as any).dribbleState.t = 0
        }
        // Only auto-switch locomotion when no move clip is locking the avatar.
        if (now > xbot.moveLockUntil) {
          const speed = Math.hypot(dirX, dirZ) * mag
          // Resolve clip name from any of several common Mixamo naming
          // variants (Walking/Walk, Running/Run, Sitting/Squat, etc.)
          const resolve = (...keys: string[]) => {
            for (const k of keys) if (xbot.clips[k]) return k
            return null
          }
          let wantClip: string | null = 'idle'
          if (xbot.defenseHeld) {
            wantClip = resolve('sitting', 'standing', 'idle')
          } else if (speed > 0.6) {
            wantClip = resolve('running', 'run', 'walking', 'walk', 'idle')
          } else if (speed > 0.1) {
            wantClip = resolve('walking', 'walk', 'running', 'run', 'idle')
          } else {
            wantClip = resolve('idle')
          }
          if (wantClip && wantClip !== xbot.currentClip) {
            const from = xbot.clips[xbot.currentClip]
            const to = xbot.clips[wantClip]
            if (to) {
              to.reset().fadeIn(0.2).play()
              if (from) from.fadeOut(0.2)
              xbot.currentClip = wantClip
            }
          }
        }
      }

      // Phase 16.39 — Walk-cycle animation (primitive humanoid fallback only).
      const limbs = (avatarHolder.userData as any).limbs as {
        legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
        torso: THREE.Mesh; head: THREE.Mesh; hair: THREE.Mesh; hips: THREE.Mesh;
      } | undefined
      if (limbs) {
        const moving = mag > 0.1
        if (moving) {
          const phase = now * 0.014
          const swing = Math.sin(phase) * 0.55
          limbs.legL.rotation.x = swing
          limbs.legR.rotation.x = -swing
          limbs.armL.rotation.x = -swing * 0.7
          limbs.armR.rotation.x = swing * 0.7
          avatarHolder.position.y = Math.abs(Math.cos(phase)) * 0.05
        } else {
          // Idle: ease limbs back to neutral
          limbs.legL.rotation.x *= 0.85
          limbs.legR.rotation.x *= 0.85
          limbs.armL.rotation.x *= 0.85
          limbs.armR.rotation.x *= 0.85
          avatarHolder.position.y *= 0.85
        }
      }

      // Phase 16.27 + 16.35 — basketball follow + physics + jump animation
      const ballRef = (scene.userData as any).ball
      if (ballRef) {
        const { ball, ballState } = ballRef
        // NBA2K jump-shot animation tick
        const updateJump = (scene.userData as any).updateJump
        if (updateJump) updateJump(dtSec)

        if (ballState.held) {
          // Phase 16.57 — branch on ball owner. Defender attaches the ball
          // to their own hand during their offensive possession.
          const owner = (ballState as any).owner || 'player'
          const carrier = (owner === 'defender' && (scene.userData as any).defender?.group)
            ? (scene.userData as any).defender.group
            : playerGroup
          const handOffset = new THREE.Vector3(
            Math.sin(carrier.rotation.y) * 0.6,
            1.3 + Math.sin(now * 0.012) * 0.18,  // bounce visual
            Math.cos(carrier.rotation.y) * 0.6,
          )
          ball.position.copy(carrier.position).add(handOffset)
          // Phase 16.39 — Dribble SFX: every ~0.42s when moving with ball held
          const moving = Math.hypot(rawX, rawZ) > 0.1
          if (moving) {
            if (!(ballRef as any).lastDribble) (ballRef as any).lastDribble = 0
            ;(ballRef as any).lastDribble += dtSec
            if ((ballRef as any).lastDribble > 0.42) {
              playDribble()
              ;(ballRef as any).lastDribble = 0
            }
          } else {
            ;(ballRef as any).lastDribble = 0
          }
          // Phase 16.74 — STEAL MECHANIC. When the OPPONENT character is
          // within close-defense range (<1.0u) of the ball carrier, every
          // ~1s tick a difficulty-tuned steal chance flips possession.
          // Closer + slower carrier = higher steal odds. Adds a real
          // defensive ceiling that crossovers + spins help you escape.
          if (!gameOver && !pausedRef.current) {
            const defState = (scene.userData as any).defender
            const defenderG = defState?.group
            if (defenderG) {
              const sdx = carrier.position.x - defenderG.position.x
              const sdz = carrier.position.z - defenderG.position.z
              const stealDist = Math.hypot(sdx, sdz)
              if (stealDist < 1.0) {
                if (!(ballRef as any).lastStealCheck) (ballRef as any).lastStealCheck = 0
                ;(ballRef as any).lastStealCheck += dtSec
                if ((ballRef as any).lastStealCheck > 1.0) {
                  ;(ballRef as any).lastStealCheck = 0
                  const diff = getDiff()
                  // base steal chance scales with difficulty; closer = bonus
                  const proximityBonus = (1.0 - stealDist) * 0.20
                  const stealChance = (diff.blockChance * 0.4) + proximityBonus
                  if (Math.random() < stealChance) {
                    // Knock the ball loose to the opposite side
                    const flipOwner = owner === 'player' ? 'defender' : 'player'
                    ;(ballState as any).owner = flipOwner
                    if (defState) {
                      defState.mode = flipOwner === 'defender' ? 'drive' : 'guard'
                      defState.shootTimer = flipOwner === 'defender' ? diff.shootTimer : 0
                    }
                    speak("STOLEN!", { pitch: 0.95, rate: 1.2 })
                    triggerBigPlay('STOLEN!', '#facc15', '⚡')
                    triggerCameraShake(0.18, 0.2)
                    playSqueak()
                    setHoopScore((s) => ({ ...s, streak: 0 }))
                  }
                }
              } else {
                ;(ballRef as any).lastStealCheck = 0
              }
            }
          }
        } else {
          // Physics tick (gravity + velocity integration + score detection)
          ;(scene.userData as any).gravity(dtSec)
          // Phase 16.74 — write current ball position to trail head
          const trail = (scene.userData as any).ballTrail
          if (trail) trail.push(ball.position)
        }
        // Phase 16.74 — refresh trail mesh every frame (held = trail
        // points sit offscreen via reset call below)
        const trailRef = (scene.userData as any).ballTrail
        if (trailRef) {
          if (ballState.held) trailRef.reset()
          trailRef.update()
        }
        // Spin the ball based on velocity for visual juice
        ball.rotation.x += ballState.vel.z * dtSec * 4
        ball.rotation.z -= ballState.vel.x * dtSec * 4
      }

      // Phase 16.39 — Sneaker squeak on hard direction changes (gym floor only)
      if (theme === 'gym') {
        if (!(scene.userData as any).lastDir) (scene.userData as any).lastDir = { x: 0, z: 0 }
        const lastDir = (scene.userData as any).lastDir as { x: number; z: number }
        const dirMag = Math.hypot(dirX, dirZ)
        const prevMag = Math.hypot(lastDir.x, lastDir.z)
        if (dirMag > 0.5 && prevMag > 0.5) {
          const dot = (lastDir.x * dirX + lastDir.z * dirZ) / (dirMag * prevMag)
          if (dot < 0.3) {  // angle change > ~70°
            if (!(scene.userData as any).lastSqueak || now - (scene.userData as any).lastSqueak > 220) {
              playSqueak()
              ;(scene.userData as any).lastSqueak = now
            }
          }
        }
        lastDir.x = dirX
        lastDir.z = dirZ
      }

      // Keyboard shoot: B key triggers shot (also gamepad A button below)
      if (keys['b'] && shootRef.current) {
        keys['b'] = false  // single-fire
        shootRef.current()
      }
      // Phase 16.39 — NBA2K move keys: C=crossover, V=spin, P=pump-fake, J=jab-step
      if (keys['c']) { keys['c'] = false; triggerMove('crossover') }
      if (keys['v']) { keys['v'] = false; triggerMove('spin') }
      if (keys['p']) { keys['p'] = false; triggerMove('pumpFake') }
      if (keys['j']) { keys['j'] = false; triggerMove('jabStep') }
      // R = recall ball to hand (emergency rescue if ball is lost)
      if (keys['r']) {
        keys['r'] = false
        const ballRef2 = (scene.userData as any).ball
        if (ballRef2) {
          ballRef2.ballState.held = true
          ballRef2.ballState.vel.set(0, 0, 0)
          ballRef2.ballState.scoredThisShot = false
          ballRef2.ballState.airborneFrames = 0
          ballRef2.ballState.returnTimer = 0
          ;(ballRef2.ballState as any).airTime = 0
          ;(ballRef2.ballState as any).rimHitThisShot = false
          ;(ballRef2.ballState as any).bbHitThisShot = false
        }
      }
      // Phase 16.41 — full 2K move keys (XBot rigged-avatar only):
      // F = fadeaway shot, X = rebound grab, Z = block, T = pass
      // G held = defensive stance
      const xbotRef = (avatarHolder.userData as any).xbot
      if (keys['f']) {
        // shootRef reads keys['f'] internally to detect fadeaway — clear AFTER
        if (shootRef.current) shootRef.current()
        keys['f'] = false
      }
      if (keys['x']) {
        keys['x'] = false
        if (xbotRef?.play) xbotRef.play('rebound', 800)
        announceMove('rebound')
        // Add a quick vertical leap so the rebound visibly jumps
        const pg = (scene.userData as any).playerGroupRef
        const js = (scene.userData as any).jumpState
        if (pg && js && !js.active) {
          js.active = true
          js.t = 0
          js.baseY = pg.position.y
          js.duration = 0.7
          js.peakY = 1.6
          js.ballRelease = 99  // never releases the ball during a rebound
          js.isDunk = false
          ;(js as any).pendingShot = null
        }
      }
      if (keys['z']) {
        keys['z'] = false
        if (xbotRef?.play) xbotRef.play('block', 700)
        announceMove('block')
        triggerCameraShake(0.15, 0.18)
        const pg = (scene.userData as any).playerGroupRef
        const js = (scene.userData as any).jumpState
        if (pg && js && !js.active) {
          js.active = true
          js.t = 0
          js.baseY = pg.position.y
          js.duration = 0.6
          js.peakY = 1.4
          js.ballRelease = 99
          js.isDunk = false
          ;(js as any).pendingShot = null
        }
      }
      if (keys['t']) {
        keys['t'] = false
        if (xbotRef?.play) xbotRef.play('pass', 500)
      }
      // Defense is hold-to-engage so we read keys['g'] every frame
      if (xbotRef) {
        const wantsDefense = !!keys['g']
        if (wantsDefense !== xbotRef.defenseHeld) {
          xbotRef.defenseHeld = wantsDefense
        }
      }
      // Phase 16.46 — FULL XBOX CONTROLLER MAPPING. Each gamepad button
      // dispatches its corresponding keyboard event so the same animate-
      // loop handlers fire whether the input came from keyboard / mobile
      // pills / Xbox controller. Single source of truth = the keyboard
      // handlers above. Edge-trigger detection per button so holding
      // doesn't auto-spam (except LT/defense which IS hold-to-engage).
      //
      //   A (0)  → 'b'  jump shot  (auto-routes to jumpshot/layup/dunk)
      //   B (1)  → 'z'  block
      //   X (2)  → 't'  pass
      //   Y (3)  → 'f'  fadeaway
      //   LB (4) → 'x'  rebound
      //   RB (5) → 'c'  crossover
      //   LT (6) → 'g'  defense (HOLD)
      //   RT (7) → 'v'  spin
      //   Sel(8) → 'j'  jab step
      //   Str(9) → 'p'  pump fake
      //   L3(10) → 'r'  recall ball
      //   R3(11) → 'b'  alt shoot
      //   DU(12) → Tab  camera preset cycle (Phase 16.64)
      const PAD_MAP: Array<{ btn: number; key: string; hold: boolean }> = [
        { btn: 0,  key: 'b', hold: false },
        { btn: 1,  key: 'z', hold: false },
        { btn: 2,  key: 't', hold: false },
        { btn: 3,  key: 'f', hold: false },
        { btn: 4,  key: 'x', hold: false },
        { btn: 5,  key: 'c', hold: false },
        { btn: 6,  key: 'g', hold: true  },  // defense — hold to engage
        { btn: 7,  key: 'v', hold: false },
        { btn: 8,  key: 'j', hold: false },
        { btn: 9,  key: 'p', hold: false },
        { btn: 10, key: 'r', hold: false },
        { btn: 11, key: 'b', hold: false },
        { btn: 12, key: 'Tab', hold: false },  // Phase 16.64 — D-pad Up cycles camera
      ]
      try {
        const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : []
        for (const p of pads) {
          if (!p) continue
          if (!gamepadConnectedRef.current) {
            gamepadConnectedRef.current = true
            setGamepadConnected(true)
          }
          for (const m of PAD_MAP) {
            const btn = p.buttons[m.btn]
            if (!btn) continue
            const wasPressed = !!gamepadButtonStateRef.current[m.btn]
            const isPressed = !!btn.pressed || (btn.value && btn.value > 0.5)
            if (isPressed && !wasPressed) {
              // Rising edge — fire keydown (single tap for non-hold,
              // start-of-hold for hold buttons)
              window.dispatchEvent(new KeyboardEvent('keydown', { key: m.key }))
            } else if (!isPressed && wasPressed && m.hold) {
              // Falling edge on a hold button — fire keyup
              window.dispatchEvent(new KeyboardEvent('keyup', { key: m.key }))
            }
            gamepadButtonStateRef.current[m.btn] = isPressed
          }
          break  // only first connected pad drives input
        }
      } catch {}

      // Phase 16.55/57 — AI DEFENDER state machine.
      //   GUARD mode: hovers between shooter and nearest rim, contests
      //   DRIVE mode: defender has the ball, walks to rim, shoots after timer
      const defenderRef = (scene.userData as any).defender
      if (defenderRef?.group && !gameOver && !pausedRef.current) {
        const dg: THREE.Group = defenderRef.group
        const hoops = (scene.userData as any).hoops || []
        const diffAI = getDiff()
        // Phase 16.60 — tick defender mixer + remember previous position so
        // we can detect motion and switch idle ↔ walking ↔ running clips
        if (defenderRef.mixer) defenderRef.mixer.update(dtSec)
        const prevDefX = (defenderRef as any).prevX ?? dg.position.x
        const prevDefZ = (defenderRef as any).prevZ ?? dg.position.z
        if (defenderRef.mode === 'drive') {
          // Walk toward nearest rim, shoot after timer or proximity
          let driveTarget: THREE.Vector3 | null = null
          let nearestD = Infinity
          for (const h of hoops) {
            const d = dg.position.distanceTo(h.rimPos)
            if (d < nearestD) { nearestD = d; driveTarget = h.rimPos }
          }
          if (driveTarget) {
            const tdx = driveTarget.x - dg.position.x
            const tdz = driveTarget.z - dg.position.z
            const tdist = Math.hypot(tdx, tdz)
            const driveSpeed = SPEED * (diffAI.speedMul - 0.15) * dtSec
            if (tdist > 4.0) {
              dg.position.x += (tdx / tdist) * Math.min(driveSpeed, tdist - 4.0)
              dg.position.z += (tdz / tdist) * Math.min(driveSpeed, tdist - 4.0)
            }
            dg.rotation.y = Math.atan2(tdx, tdz)
            defenderRef.shootTimer -= dtSec
            if (defenderRef.shootTimer <= 0 || tdist < 4.2) {
              const ds = (scene.userData as any).defenderShoot
              if (ds) ds()
            }
          }
        } else {
          // GUARD mode: stay between player and player's nearest rim
          const playerPos = playerGroup.position
          let nearestRim: THREE.Vector3 | null = null
          let nearestDist = Infinity
          for (const h of hoops) {
            const d = playerPos.distanceTo(h.rimPos)
            if (d < nearestDist) { nearestDist = d; nearestRim = h.rimPos }
          }
          if (nearestRim) {
            const ldx = nearestRim.x - playerPos.x
            const ldz = nearestRim.z - playerPos.z
            const linedist = Math.hypot(ldx, ldz) || 1
            const tx = playerPos.x + (ldx / linedist) * 1.5
            const tz = playerPos.z + (ldz / linedist) * 1.5
            const cdx = tx - dg.position.x
            const cdz = tz - dg.position.z
            const cdist = Math.hypot(cdx, cdz)
            const defSpeed = SPEED * diffAI.speedMul * dtSec
            if (cdist > 0.05) {
              dg.position.x += (cdx / cdist) * Math.min(defSpeed, cdist)
              dg.position.z += (cdz / cdist) * Math.min(defSpeed, cdist)
            }
            const fdx = playerPos.x - dg.position.x
            const fdz = playerPos.z - dg.position.z
            dg.rotation.y = Math.atan2(fdx, fdz)
          }
        }
        // Phase 16.60 — defender idle/walking/running based on travel
        if (defenderRef.clips) {
          const moved = Math.hypot(dg.position.x - prevDefX, dg.position.z - prevDefZ) / Math.max(dtSec, 1e-4)
          let wantDef = 'idle'
          if (moved > 5) wantDef = defenderRef.clips['running'] ? 'running' : (defenderRef.clips['walking'] ? 'walking' : 'idle')
          else if (moved > 0.2) wantDef = defenderRef.clips['walking'] ? 'walking' : 'idle'
          if (wantDef !== defenderRef.currentClip) {
            const from = defenderRef.clips[defenderRef.currentClip]
            const to = defenderRef.clips[wantDef]
            if (to) {
              to.reset().fadeIn(0.2).play()
              if (from) from.fadeOut(0.2)
              defenderRef.currentClip = wantDef
            }
          }
          ;(defenderRef as any).prevX = dg.position.x
          ;(defenderRef as any).prevZ = dg.position.z
        }
      }

      // Phase 16.70 — shot meter tick. Fills from 0→100% over release window.
      // Quality bands: 0-50 early, 50-70 good, 70-90 perfect, 90-100+ late.
      // At 100% the meter expires + announces quality flash (handled below).
      if (shotMeterRef.current) {
        const m = shotMeterRef.current
        const elapsed = now - m.startMs
        const progress = Math.min(1.1, elapsed / m.durationMs)
        let quality: 'early' | 'good' | 'perfect' | 'late' = 'early'
        if (progress >= 0.9) quality = 'late'
        else if (progress >= 0.70) quality = 'perfect'
        else if (progress >= 0.50) quality = 'good'
        setShotMeter({ active: true, progress, quality })
        if (progress >= 1.1) {
          shotMeterRef.current = null
          setTimeout(() => setShotMeter(null), 350)
        }
      }

      // Phase 16.53 — game clocks tick. Shot clock decrements while
      // running; session timer counts up. Sync to React state every 0.25s
      // (not every frame) to keep React renders quiet. Shot clock
      // violation = ball returns, announcer call.
      if (clocksRunningRef.current && !pausedRef.current && !gameOver) {
        shotClockRef.current = Math.max(0, shotClockRef.current - dtSec)
        sessionTimeRef.current += dtSec
        ;(scene.userData as any).__clockSyncT = ((scene.userData as any).__clockSyncT || 0) + dtSec
        if ((scene.userData as any).__clockSyncT > 0.25) {
          ;(scene.userData as any).__clockSyncT = 0
          setShotClock(Math.ceil(shotClockRef.current))
          setSessionTime(Math.floor(sessionTimeRef.current))
        }
        if (shotClockRef.current <= 0 && !(scene.userData as any).__shotClockBuzzed) {
          ;(scene.userData as any).__shotClockBuzzed = true
          playBuzzer()
          speak("SHOT CLOCK VIOLATION!", { pitch: 0.92, rate: 1.15 })
          // Reset shot clock + return ball so player keeps shooting
          const ballRefSC = (scene.userData as any).ball
          if (ballRefSC) {
            ballRefSC.ballState.held = true
            ballRefSC.ballState.vel.set(0, 0, 0)
            ballRefSC.ballState.scoredThisShot = false
            ;(ballRefSC.ballState as any).airTime = 0
          }
          shotClockRef.current = 24
          setShotClock(24)
          setTimeout(() => { (scene.userData as any).__shotClockBuzzed = false }, 1500)
          setHoopScore((s) => ({ ...s, streak: 0 }))
        }
      }

      // Phase 16.64 — NBA 2K-style camera presets. Each preset computes its
      // own camTarget, lookAt, and lerp speed. 2K is the default drag-orbit
      // cam (Phase 16.21 behavior preserved). Other presets are fixed-angle
      // views that mimic NBA 2K's broadcast / side / high / lock / skybox
      // options. Cycle with Tab (keyboard) or D-pad Up (gamepad).
      const preset = cameraPresetRef.current
      let camTarget: THREE.Vector3
      let lookAtX = playerGroup.position.x
      let lookAtY = playerGroup.position.y + 1
      let lookAtZ = playerGroup.position.z
      let lerpSpeed = 0.15
      const hoopsArr = ((scene.userData as any).hoops || []) as Array<{ rimPos: THREE.Vector3 }>
      const courtMidZ = hoopsArr[0] ? hoopsArr[0].rimPos.z * 0.5 : 0
      if (preset === '2K') {
        const d = 8
        const ch = 3.4 + Math.sin(cameraPitch) * 4
        camTarget = new THREE.Vector3(
          playerGroup.position.x + Math.sin(cameraYaw) * d,
          playerGroup.position.y + ch,
          playerGroup.position.z + Math.cos(cameraYaw) * d,
        )
      } else if (preset === 'BROADCAST') {
        camTarget = new THREE.Vector3(16, 10, courtMidZ)
        lookAtX = playerGroup.position.x * 0.25
        lookAtY = 2.2
        lookAtZ = courtMidZ * 0.7 + playerGroup.position.z * 0.3
        lerpSpeed = 0.08
      } else if (preset === 'SIDE') {
        camTarget = new THREE.Vector3(20, 5.5, courtMidZ)
        lookAtX = 0
        lookAtY = 2.5
        lookAtZ = courtMidZ
        lerpSpeed = 0.08
      } else if (preset === 'HIGH') {
        const d = 13
        camTarget = new THREE.Vector3(
          playerGroup.position.x + Math.sin(cameraYaw) * d * 0.5,
          playerGroup.position.y + 10,
          playerGroup.position.z + Math.cos(cameraYaw) * d,
        )
        lookAtY = playerGroup.position.y - 0.5
      } else if (preset === 'PLAYER LOCK') {
        const d = 3.4
        camTarget = new THREE.Vector3(
          playerGroup.position.x + Math.sin(cameraYaw) * d,
          playerGroup.position.y + 2.2,
          playerGroup.position.z + Math.cos(cameraYaw) * d,
        )
        lookAtY = playerGroup.position.y + 1.5
        lerpSpeed = 0.28
      } else {
        camTarget = new THREE.Vector3(playerGroup.position.x, 24, playerGroup.position.z + 0.1)
        lookAtY = 0
        lerpSpeed = 0.1
      }
      camera.position.lerp(camTarget, lerpSpeed)
      // Phase 16.51 — camera shake (dunks, hot streaks). Decays linearly
      // over duration; applies random offset to camera each frame so the
      // image jitters without the character moving.
      const shake = cameraShakeRef.current
      if (shake.t < shake.duration) {
        shake.t += dtSec
        const remaining = Math.max(0, 1 - shake.t / shake.duration)
        const amp = shake.intensity * remaining
        camera.position.x += (Math.random() - 0.5) * amp
        camera.position.y += (Math.random() - 0.5) * amp
        camera.position.z += (Math.random() - 0.5) * amp
      }
      camera.lookAt(lookAtX, lookAtY, lookAtZ)

      // Proximity audio — fade in/out based on distance
      let closestPlaying: string | null = null
      let closestDist = Infinity
      frameMeshes.forEach(fm => {
        const dist = playerGroup.position.distanceTo(fm.group.position)
        const audio = audioRefsMap.current.get(fm.track.id)
        if (audio) {
          if (dist < 4) {
            const targetVol = Math.max(0, 1 - dist / 4) * 0.6
            audio.volume = targetVol
            if (audio.paused && targetVol > 0.1) {
              audio.play().catch(() => {})
            }
            if (dist < closestDist) {
              closestDist = dist
              closestPlaying = fm.track.title || null
            }
          } else {
            audio.volume = 0
            if (!audio.paused) audio.pause()
          }
        }
      })
      if (closestPlaying !== nowPlaying) setNowPlaying(closestPlaying)

      // Phase 16.66 — render through EffectComposer for bloom pipeline
      composer.render()
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(fitTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('character-updated', onCharacterUpdated)
      window.removeEventListener('storage', onStorageChange)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('touchend', onClick as any)
      // Stop all audio
      audioRefsMap.current.forEach(a => { a.pause(); a.src = '' })
      audioRefsMap.current.clear()
      try { container.removeChild(renderer.domElement) } catch {}
      renderer.dispose()
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose())
          else obj.material.dispose()
        }
      })
    }
  }, [tracks, theme, loading, nowPlaying, placedFurniture])

  const addFurniture = useCallback((itemId: string) => {
    const item = getFurnitureById(itemId)
    if (!item) return
    const newPlaced: PlacedFurniture = {
      itemId,
      x: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
      rotation: 0,
      color: item.color,
    }
    const updated = [...placedFurniture, newPlaced]
    setPlacedFurniture(updated)
    savePlacedFurniture(ownerHandle, updated)
    toast.success(`${item.emoji} ${item.name} placed!`)
    setPlacingItem(null)
  }, [placedFurniture, ownerHandle])

  const removeFurniture = useCallback((index: number) => {
    const updated = placedFurniture.filter((_, i) => i !== index)
    setPlacedFurniture(updated)
    savePlacedFurniture(ownerHandle, updated)
    toast.success('Furniture removed')
  }, [placedFurniture, ownerHandle])

  // Auto-focus container for keyboard events
  useEffect(() => {
    if (containerRef.current) containerRef.current.focus()
  }, [loading])

  // Phase 16.26 + 16.35 — repaint location sign + force horizon rebuild
  // when cityLocation changes so different searched cities actually look
  // different (different building palette/density/heights/window colors).
  useEffect(() => {
    cityLocationRef.current = cityLocation
    const scene = sceneRef.current
    if (!scene) return
    const ls = (scene.userData as any).locSign as { paint: (l: any) => void; texture: THREE.CanvasTexture } | undefined
    if (ls) {
      ls.paint(cityLocation)
      ls.texture.needsUpdate = true
    }
    // For now, bump the scene-rebuild trigger via toggling loading. Heavy
    // but reliable — different cities now produce different horizons.
    if (cityLocation) {
      setLoading(true)
      const t = setTimeout(() => setLoading(false), 100)
      return () => clearTimeout(t)
    }
  }, [cityLocation])

  return (
    <div className="relative w-full h-full" tabIndex={0} onFocus={() => containerRef.current?.focus()}>
      <div ref={containerRef} className="absolute inset-0" tabIndex={0} style={{ cursor: 'grab', outline: 'none' }} onClick={() => containerRef.current?.focus()} />

      {/* Phase 16.59 — pause overlay */}
      {paused && !gameOver && (theme === 'gym' || theme === 'blacktop') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setPaused(false)}>
          <div className="text-white font-mono font-bold text-5xl sm:text-7xl tracking-widest drop-shadow-2xl select-none">
            PAUSED
            <div className="text-sm text-gray-400 mt-3 text-center tracking-normal">tap anywhere to resume</div>
          </div>
        </div>
      )}

      {/* Phase 16.64 — MISS / RIM OUT / OFF BOARD / AIRBALL callout. Sits
          above scorePopups but below bigPlay. Auto-clears after 1200ms. */}
      {shotResult && (
        <div className="absolute inset-x-0 top-1/3 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="font-mono font-black px-5 py-2 rounded backdrop-blur"
            style={{
              fontSize: 'clamp(1.4rem, 5vw, 2.6rem)',
              color: shotResult.color,
              textShadow: `0 0 18px ${shotResult.color}, 0 2px 6px rgba(0,0,0,0.9)`,
              animation: 'sc-shotmiss 1.2s ease-out forwards',
              letterSpacing: '0.08em',
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${shotResult.color}`,
            }}
          >
            {shotResult.text}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes sc-shotmiss {
          0%   { opacity: 0; transform: scale(0.7) translateY(-6px); }
          18%  { opacity: 1; transform: scale(1.1) translateY(0); }
          70%  { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(8px); }
        }
      `}</style>
      {/* Phase 16.75 — CHECK BALL banner after every make. 1.5s pause
          while characters reset to half-court. Gives the game a real-
          basketball rhythm: score → check → next possession. */}
      {inboundActive && (theme === 'gym' || theme === 'blacktop') && !gameOver && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="px-5 py-2 rounded-lg text-white font-mono font-extrabold text-lg tracking-widest"
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: '3px solid #facc15',
              boxShadow: '0 0 28px rgba(250,204,21,0.55)',
            }}
          >
            ✓ CHECK BALL
          </div>
        </div>
      )}

      {/* Phase 16.73 — ON DEFENSE banner. Pulses while opponent has the
          ball so the player understands they're no longer on offense. */}
      {possession === 'defender' && (theme === 'gym' || theme === 'blacktop') && !gameOver && (
        <div className="absolute top-12 sm:top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="px-4 py-1.5 rounded-full text-white font-mono font-extrabold text-sm tracking-widest animate-pulse"
            style={{
              background: 'linear-gradient(90deg, rgba(8,145,178,0.95), rgba(220,38,38,0.95))',
              border: '2px solid #f87171',
              boxShadow: '0 0 28px rgba(220,38,38,0.6), 0 0 12px rgba(8,145,178,0.5)',
            }}
          >
            🛡 ON DEFENSE — TAP TO BLOCK
          </div>
        </div>
      )}

      {/* Phase 16.71 — NOW PLAYING arena music pill (SCid NFT track).
          Tap the ⏭ to skip to the next track. Tap the title to open the
          track page in a new tab. Compact, sits top-center of the canvas. */}
      {arenaTrack && (theme === 'gym' || theme === 'blacktop') && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur border border-cyan-400/40 shadow-lg max-w-[80vw]">
            {arenaTrack.artworkUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={arenaTrack.artworkUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[9px] font-mono text-cyan-400 leading-tight">🎵 ARENA</div>
              <div className="text-[10px] font-mono font-bold text-white truncate max-w-[160px] sm:max-w-[240px]">{arenaTrack.title}</div>
            </div>
            <div className="hidden sm:block text-[9px] font-mono text-gray-400 truncate max-w-[120px]">{arenaTrack.artist}</div>
            <button
              onClick={() => {
                const a = arenaAudioRef.current
                if (a) { try { a.dispatchEvent(new Event('ended')) } catch {} }
              }}
              className="text-white/70 hover:text-white text-xs px-1"
              aria-label="Skip track"
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {/* Phase 16.70 — 2K-style shot meter. Vertical arc bar above the
          player during shot animation. Fills from gray → green at the
          perfect-release window. Mirrors NBA 2K's signature shot timing UI. */}
      {shotMeter && shotMeter.active && (theme === 'gym' || theme === 'blacktop') && (
        <div className="absolute left-1/2 top-[35%] -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
          <div className="relative w-3 h-32 bg-black/60 rounded-full border border-white/30 overflow-hidden">
            <div
              className="absolute bottom-0 left-0 right-0 transition-none"
              style={{
                height: `${Math.min(100, shotMeter.progress * 100)}%`,
                backgroundColor: shotMeter.quality === 'perfect'
                  ? '#22c55e'
                  : shotMeter.quality === 'good'
                  ? '#facc15'
                  : shotMeter.quality === 'late'
                  ? '#ef4444'
                  : '#94a3b8',
                boxShadow: shotMeter.quality === 'perfect'
                  ? '0 0 20px #22c55e, 0 0 40px #22c55e'
                  : 'none',
              }}
            />
            {/* Perfect-window marker (70-90% band) */}
            <div className="absolute left-0 right-0 border-y border-white/40" style={{ top: '10%', bottom: '15%' }} />
          </div>
          {shotMeter.quality === 'perfect' && (
            <div className="text-[10px] font-mono font-bold text-green-400 mt-1 animate-pulse drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">PERFECT</div>
          )}
        </div>
      )}

      {/* Phase 16.58 — BIG PLAY CAM banner: full-screen flash on signature
          moments. Different colors per play type. CSS keyframe handles
          entrance burst + hold + exit. */}
      {bigPlay && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            className="font-mono font-black text-center px-8 py-4"
            style={{
              fontSize: 'clamp(2.5rem, 10vw, 6rem)',
              color: bigPlay.color,
              textShadow: `0 0 30px ${bigPlay.color}, 0 0 60px ${bigPlay.color}, 0 4px 12px rgba(0,0,0,0.95)`,
              animation: 'sc-bigplay 1.6s ease-out forwards',
              letterSpacing: '0.05em',
            }}
          >
            <div className="text-7xl sm:text-8xl mb-1 drop-shadow-2xl">{bigPlay.emoji}</div>
            {bigPlay.text}
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes sc-bigplay {
          0%   { opacity: 0; transform: scale(0.3) rotate(-8deg); }
          15%  { opacity: 1; transform: scale(1.35) rotate(3deg); }
          25%  { opacity: 1; transform: scale(1.0) rotate(0deg); }
          75%  { opacity: 1; transform: scale(1.0) rotate(0deg); }
          100% { opacity: 0; transform: scale(0.8) rotate(0deg); }
        }
      `}</style>

      {/* Phase 16.56 — GAME OVER overlay (first to 21) */}
      {gameOver && (theme === 'gym' || theme === 'blacktop') && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto">
          <div className="bg-gradient-to-br from-orange-500/30 to-red-600/40 border-4 border-yellow-400 rounded-2xl px-6 py-6 text-center shadow-[0_0_60px_rgba(250,204,21,0.6)] max-w-md w-[90vw]">
            <div className="text-yellow-300 font-mono text-xs mb-2 tracking-widest">FINAL</div>
            <div className="text-white font-bold text-3xl sm:text-5xl mb-3">
              {gameOver === 'player' ? '🏆 MVP — YOU WIN' : '😞 GAME OVER'}
            </div>
            <div className="text-white font-mono text-2xl mb-4">
              <span className="text-cyan-300">YOU {pointScore.player}</span>
              <span className="text-gray-500 mx-3">—</span>
              <span className="text-red-400">DEF {pointScore.defender}</span>
            </div>
            {/* Phase 16.58 — final stat breakdown */}
            <div className="bg-black/40 rounded-lg px-3 py-2 mb-4 text-left font-mono text-[11px] text-gray-300">
              <div className="text-yellow-300 text-[10px] mb-1 font-bold tracking-wider">STATS</div>
              {Object.entries(gameStats).map(([type, stats]) => {
                if (stats.attempts === 0) return null
                const pct = Math.round((stats.makes / stats.attempts) * 100)
                return (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize text-gray-400">{type === 'three' ? '3PT' : type}</span>
                    <span><span className="text-white">{stats.makes}/{stats.attempts}</span> <span className="text-gray-500">({pct}%)</span></span>
                  </div>
                )
              })}
              {defenderBlocks > 0 && (
                <div className="flex justify-between mt-1 pt-1 border-t border-white/10">
                  <span className="text-red-400">REJECTED</span>
                  <span className="text-white">{defenderBlocks}x</span>
                </div>
              )}
              <div className="flex justify-between mt-1 pt-1 border-t border-white/10">
                <span className="text-gray-400">GAME TIME</span>
                <span className="text-white">{Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, '0')}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setGameOver(null)
                setPointScore({ player: 0, defender: 0 })
                setHoopScore({ makes: 0, attempts: 0, streak: 0 })
                setGameStats({
                  jumpshot: { makes: 0, attempts: 0 },
                  three: { makes: 0, attempts: 0 },
                  dunk: { makes: 0, attempts: 0 },
                  layup: { makes: 0, attempts: 0 },
                  fadeaway: { makes: 0, attempts: 0 },
                })
                setDefenderBlocks(0)
                shotClockRef.current = 24
                setShotClock(24)
                sessionTimeRef.current = 0
                setSessionTime(0)
                hotZoneRef.current.clear()
                const hm = (sceneRef.current as any)?.userData?.heatmap
                if (hm) {
                  hm.ctx.clearRect(0, 0, hm.canvas.width, hm.canvas.height)
                  hm.texture.needsUpdate = true
                }
                const ds = (sceneRef.current as any)?.userData?.defender
                if (ds) { ds.mode = 'guard'; ds.shootTimer = 0 }
              }}
              className="px-6 py-3 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold font-mono text-sm transition active:scale-95"
            >
              ▶ RUN IT BACK
            </button>
          </div>
        </div>
      )}

      {/* Phase 16.51 — Score popups (+2 / +3 / SLAM!) float up over the make
          location, fading out in 1.4s. Pure DOM overlay so canvas perf is
          untouched. CSS animation handles the float + fade. */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {scorePopups.map((p) => (
          <div
            key={p.id}
            className="absolute font-bold font-mono text-2xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{
              left: `${p.screenX}px`,
              top: `${p.screenY}px`,
              transform: 'translate(-50%, -100%)',
              color: p.color,
              animation: 'sc-score-popup 1.4s ease-out forwards',
              textShadow: `0 0 12px ${p.color}, 0 0 24px ${p.color}`,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes sc-score-popup {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          15%  { opacity: 1; transform: translate(-50%, -100%) scale(1.3); }
          30%  { opacity: 1; transform: translate(-50%, -110%) scale(1.0); }
          80%  { opacity: 1; transform: translate(-50%, -180%) scale(1.0); }
          100% { opacity: 0; transform: translate(-50%, -260%) scale(0.9); }
        }
      `}</style>

      {/* Phase 16.47 — multiplayer lobby UI. Shows a "VS" pill in solo mode;
          opens a panel with Create/Join when tapped. While connected,
          shows a small connected-status pill with disconnect button. */}
      {(theme === 'gym' || theme === 'blacktop') && (
        <div className="absolute top-20 right-3 z-30 flex flex-col gap-2 items-end pointer-events-auto">
          {mpMode === 'solo' && (
            <button
              onClick={() => setMpMode('lobby')}
              className="px-3 py-1.5 rounded-full text-xs font-mono font-extrabold tracking-widest text-white bg-red-600 border-2 border-red-300 shadow-lg shadow-red-500/40 active:scale-95 transition"
              style={{ boxShadow: '0 0 16px rgba(220,38,38,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)' }}
            >
              ⚔️ VS · 1-ON-1
            </button>
          )}
          {mpMode === 'lobby' && (
            <div
              className="rounded-xl p-3 w-72 max-w-[90vw]"
              style={{
                background: 'rgba(0,0,0,0.92)',
                border: '2px solid #dc2626',
                boxShadow: '0 0 24px rgba(220,38,38,0.4), inset 0 0 12px rgba(220,38,38,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase">⚔️ 1-on-1 Lobby</span>
                <button onClick={() => { setMpMode('solo'); setMpError('') }} className="text-white/70 text-xs">✕</button>
              </div>
              <button
                onClick={() => {
                  const fn = (sceneRef.current as any)?.userData?.startMultiplayerHost
                  if (fn) fn()
                }}
                className="w-full mb-2 px-3 py-2 rounded-lg text-xs font-mono font-bold text-white bg-red-600 border-2 border-red-300 active:scale-95 transition"
              >
                🏀 CREATE ROOM
              </button>
              <div className="text-[9px] font-mono text-white/50 mb-1 mt-2 uppercase tracking-wider">or join with code</div>
              <div className="flex gap-1.5">
                <input
                  value={mpJoinInput}
                  onChange={(e) => setMpJoinInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="6-CHAR CODE"
                  className="flex-1 px-2 py-1.5 rounded text-white text-sm font-mono tracking-widest text-center bg-zinc-900 border-2 border-zinc-700 focus:border-red-400 outline-none"
                  style={{ letterSpacing: '0.15em' }}
                />
                <button
                  onClick={() => {
                    if (mpJoinInput.length !== 6) { setMpError('Code must be 6 chars'); return }
                    const fn = (sceneRef.current as any)?.userData?.startMultiplayerGuest
                    if (fn) fn(mpJoinInput)
                  }}
                  className="px-3 py-1.5 rounded text-xs font-mono font-bold text-white bg-emerald-600 border-2 border-emerald-300 active:scale-95 transition"
                >
                  JOIN
                </button>
              </div>
              {mpError && <div className="mt-2 text-[10px] font-mono text-red-400">{mpError}</div>}
            </div>
          )}
          {mpMode === 'host-waiting' && (
            <div
              className="rounded-xl p-3 w-72 max-w-[90vw]"
              style={{
                background: 'rgba(0,0,0,0.92)',
                border: '2px solid #dc2626',
                boxShadow: '0 0 24px rgba(220,38,38,0.4)',
              }}
            >
              <div className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase mb-2">⏳ Waiting for Player 2…</div>
              <div className="text-xs font-mono text-white/70 mb-1">Share this code:</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded bg-zinc-900 border-2 border-red-400 text-white text-2xl font-mono font-extrabold tracking-[0.3em] text-center">
                  {mpRoomCode || '...'}
                </div>
                <button
                  onClick={() => { if (mpRoomCode) { navigator.clipboard?.writeText(mpRoomCode).catch(() => {}); toast.success('Code copied') } }}
                  className="px-3 py-2 rounded text-xs font-mono font-bold text-white bg-zinc-700 border-2 border-zinc-500 active:scale-95"
                  aria-label="Copy code"
                >
                  📋
                </button>
              </div>
              {/* Phase 16.63 — share LINK button (deep-link auto-join). Tap
                  to copy a one-tap join URL friend can open on ANY device.
                  navigator.share where supported (mobile) for native sheet. */}
              <button
                onClick={async () => {
                  if (!mpRoomCode) return
                  const url = `${window.location.origin}/gallery3d?theme=${theme}&room=${mpRoomCode}`
                  if ((navigator as any).share) {
                    try {
                      await (navigator as any).share({ title: 'SoundChain Gym 1-on-1', text: `Join my SC gym game — code ${mpRoomCode}`, url })
                      return
                    } catch {}
                  }
                  try { await navigator.clipboard?.writeText(url); toast.success('Share link copied') } catch {}
                }}
                className="w-full mt-2 px-3 py-2 rounded text-[11px] font-mono font-bold text-white bg-cyan-600 border-2 border-cyan-300 active:scale-95"
              >
                🔗 SHARE LINK (auto-join)
              </button>
              <button
                onClick={() => {
                  const fn = (sceneRef.current as any)?.userData?.teardownPeer
                  if (fn) fn()
                }}
                className="w-full mt-3 px-3 py-1.5 rounded text-[10px] font-mono font-bold text-white bg-zinc-700 border-2 border-zinc-500 active:scale-95"
              >
                CANCEL
              </button>
            </div>
          )}
          {mpMode === 'guest-joining' && (
            <div
              className="rounded-xl p-3 w-72 max-w-[90vw]"
              style={{ background: 'rgba(0,0,0,0.92)', border: '2px solid #10b981' }}
            >
              <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">🤝 Connecting…</div>
            </div>
          )}
          {mpMode === 'connected' && (
            <div
              className="rounded-full px-3 py-1.5 flex items-center gap-2"
              style={{
                background: 'rgba(0,0,0,0.92)',
                border: '2px solid #10b981',
                boxShadow: '0 0 16px rgba(16,185,129,0.4)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-white">VS · {mpRemoteHandle}</span>
              <button
                onClick={() => {
                  const fn = (sceneRef.current as any)?.userData?.teardownPeer
                  if (fn) fn()
                }}
                className="ml-1 text-xs text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 16.45 — basketball CONTROLS PANEL. Pre-fix the action pills
          were translucent /40-/60 gradients that blended into every other
          SC chrome pill on the right side. Now: solid dark panel with a
          distinct arena-red frame + "🏀 PLAYBOOK" header so the controls
          read as ONE control unit visually owned by the gym surface, not
          a stack of pills competing with global chrome. Buttons themselves
          are larger (w-14 h-14), more saturated colors, and use bg-black/90
          for solid backgrounds (no /40 translucency). */}
      {(theme === 'gym' || theme === 'blacktop' || theme === 'city') && (() => {
        const tap = (k: string) => (e: React.PointerEvent) => {
          e.stopPropagation()
          window.dispatchEvent(new KeyboardEvent('keydown', { key: k }))
        }
        const press = (k: string, down: boolean) => (e: React.PointerEvent) => {
          e.stopPropagation()
          window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k }))
        }
        type Btn = { label: string; emoji: string; key: string; color: string }
        // Color-coded by category so each move reads at a glance:
        //   CYAN   = rebound/block (defensive ball moves)
        //   GREEN  = pass (ball distribution)
        //   ORANGE = fadeaway (variant shot)
        //   PURPLE = ball-handler moves (crossover/spin/pumpfake/jabstep)
        const moves: Btn[] = [
          { label: 'REB',  emoji: '⬆️', key: 'x', color: 'bg-cyan-600 border-cyan-300 shadow-cyan-500/50' },
          { label: 'BLK',  emoji: '🛡️', key: 'z', color: 'bg-cyan-600 border-cyan-300 shadow-cyan-500/50' },
          { label: 'PASS', emoji: '🤲', key: 't', color: 'bg-emerald-600 border-emerald-300 shadow-emerald-500/50' },
          { label: 'FADE', emoji: '🎯', key: 'f', color: 'bg-orange-600 border-orange-300 shadow-orange-500/50' },
          { label: 'X-O',  emoji: '🔄', key: 'c', color: 'bg-purple-600 border-purple-300 shadow-purple-500/50' },
          { label: 'SPIN', emoji: '💫', key: 'v', color: 'bg-purple-600 border-purple-300 shadow-purple-500/50' },
          { label: 'PMP',  emoji: '👆', key: 'p', color: 'bg-purple-600 border-purple-300 shadow-purple-500/50' },
          { label: 'JAB',  emoji: '➡️', key: 'j', color: 'bg-purple-600 border-purple-300 shadow-purple-500/50' },
        ]
        return (
          <div
            className="absolute bottom-3 right-3 z-30 sm:hidden pointer-events-auto rounded-2xl"
            style={{
              background: 'rgba(0,0,0,0.88)',
              border: '2px solid #dc2626',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 24px rgba(220,38,38,0.35), inset 0 0 12px rgba(220,38,38,0.08)',
              padding: '8px',
            }}
          >
            {/* Panel header — labels the unit so it's clearly "the basketball controls" */}
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[9px] font-mono font-bold tracking-widest text-red-400 uppercase">🏀 Playbook</span>
              <span className="text-[8px] font-mono text-red-300/70 uppercase tracking-wider">Tap</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {moves.map(m => (
                <button
                  key={m.key}
                  onPointerDown={tap(m.key)}
                  className={`w-14 h-14 rounded-lg ${m.color} border-2 text-white text-[11px] font-mono font-extrabold active:scale-90 transition flex flex-col items-center justify-center gap-0.5 shadow-lg`}
                  aria-label={m.label}
                >
                  <span className="text-lg leading-none drop-shadow-md">{m.emoji}</span>
                  <span className="leading-none tracking-wide">{m.label}</span>
                </button>
              ))}
            </div>
            <button
              onPointerDown={press('g', true)}
              onPointerUp={press('g', false)}
              onPointerLeave={press('g', false)}
              onPointerCancel={press('g', false)}
              className="mt-1.5 w-full h-11 rounded-lg bg-red-600 border-2 border-red-300 text-white text-[11px] font-mono font-extrabold active:scale-95 transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/40"
              aria-label="Defensive stance (hold)"
            >
              <span className="text-base">🛡️</span>
              <span className="tracking-wider">DEF · HOLD</span>
            </button>
          </div>
        )
      })()}

      {/* Phase 16.45 — mobile D-pad framed as a control unit matching the
          right-side playbook panel. Solid dark backing + arena-red border
          so it reads as "movement controls" not random chrome pills. */}
      <div
        className="absolute bottom-16 left-3 z-10 sm:hidden flex flex-col items-center gap-1 rounded-2xl"
        style={{
          background: 'rgba(0,0,0,0.88)',
          border: '2px solid #dc2626',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 18px rgba(220,38,38,0.3), inset 0 0 10px rgba(220,38,38,0.06)',
          padding: '6px 8px 8px',
        }}
      >
        <div className="text-[9px] font-mono font-bold tracking-widest text-red-400 uppercase mb-1">🕹️ Move</div>
        <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }))} className="w-11 h-11 rounded-md bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center text-white text-xl font-bold active:bg-red-700 active:border-red-300 transition shadow-md">↑</button>
        <div className="flex gap-1">
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }))} className="w-11 h-11 rounded-md bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center text-white text-xl font-bold active:bg-red-700 active:border-red-300 transition shadow-md">←</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }))} className="w-11 h-11 rounded-md bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center text-white text-xl font-bold active:bg-red-700 active:border-red-300 transition shadow-md">↓</button>
          <button onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))} onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }))} className="w-11 h-11 rounded-md bg-zinc-800 border-2 border-zinc-500 flex items-center justify-center text-white text-xl font-bold active:bg-red-700 active:border-red-300 transition shadow-md">→</button>
        </div>
      </div>

      {/* Phase 16.27 + 16.29 — basketball SHOOT button.
          Moved to LEFT side (above D-pad) so it doesn't collide with the
          global SC chrome pills (search / brain / Invite / Customize) on
          the right side. Big circular tap target visible on all devices. */}
      {(theme === 'city' || theme === 'gym' || theme === 'blacktop') && (
        <>
          {/* Phase 16.73 — possession-aware primary action. Player has ball
              → 🏀 SHOOT (orange). Defender has ball → 🛡 BLOCK (cyan).
              Real basketball rules: when you miss, ball goes to opponent,
              you swap to defense automatically. */}
          {possession === 'player' ? (
            <button
              onPointerDown={(e) => { e.stopPropagation(); shootRef.current?.() }}
              className="absolute bottom-40 left-3 sm:bottom-32 sm:left-5 z-30 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-500 border-[3px] border-orange-200 text-white text-3xl sm:text-4xl font-bold active:scale-90 active:bg-orange-400 transition flex items-center justify-center pointer-events-auto"
              style={{
                boxShadow: '0 0 0 2px rgba(0,0,0,0.6), 0 0 28px rgba(249,115,22,0.7), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.25)',
              }}
              aria-label="Shoot basketball"
            >
              🏀
            </button>
          ) : (
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }))
              }}
              className="absolute bottom-40 left-3 sm:bottom-32 sm:left-5 z-30 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cyan-500 border-[3px] border-cyan-200 text-white text-3xl sm:text-4xl font-bold active:scale-90 active:bg-cyan-400 transition flex items-center justify-center pointer-events-auto"
              style={{
                boxShadow: '0 0 0 2px rgba(0,0,0,0.6), 0 0 28px rgba(6,182,212,0.7), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.25)',
              }}
              aria-label="Block shot"
            >
              🛡
            </button>
          )}
          <button
            onPointerDown={(e) => {
              e.stopPropagation()
              const sc = sceneRef.current as any
              const ballRef = sc?.userData?.ball
              if (ballRef) {
                ballRef.ballState.held = true
                ballRef.ballState.vel.set(0, 0, 0)
                ballRef.ballState.returnTimer = 0
                ballRef.ballState.airborneFrames = 0
                ballRef.ballState.scoredThisShot = false
                ballRef.ballState.airTime = 0
                ballRef.ballState.bounces = 0
                ballRef.ballState.rimHitThisShot = false
                ballRef.ballState.bbHitThisShot = false
              }
            }}
            className="absolute bottom-24 left-3 sm:bottom-12 sm:left-5 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-cyan-500/40 to-cyan-700/60 backdrop-blur border-2 border-cyan-400/70 text-white text-lg sm:text-xl font-bold active:scale-95 transition shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center pointer-events-auto"
            aria-label="Recall ball to hand"
          >
            ↺
          </button>
        </>
      )}

      {/* Phase 16.33 — modal rendered via React PORTAL to document.body so
          it's outside any parent CSS / event-delegation context. No ancestor
          can intercept keystrokes or pointer events. Click-outside-to-close
          REMOVED — × button is the only close trigger now (was causing event
          handling races on Chrome that prevented input from getting focus). */}
      {citySearchOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
        >
          <div
            className="w-full max-w-md bg-[#0a0a0a] border-2 border-yellow-500/40 rounded-xl shadow-2xl shadow-yellow-500/20 overflow-hidden mt-12 sm:mt-0"
          >
            <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center justify-between">
              <div className="font-mono text-sm text-yellow-300 font-bold">🌍 SEARCH CITY / STREET</div>
              <button
                type="button"
                onClick={() => setCitySearchOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none px-3 py-1"
              >×</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const q = citySearchValue.trim()
                if (!q || citySearchLoading) return
                setCitySearchLoading(true)
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
                    headers: { 'Accept': 'application/json' },
                  })
                  const data = await res.json()
                  if (Array.isArray(data) && data[0]) {
                    const loc = {
                      label: data[0].display_name.split(',').slice(0, 3).join(',').trim(),
                      lat: parseFloat(data[0].lat),
                      lng: parseFloat(data[0].lon),
                    }
                    setCityLocation(loc)
                    cityLocationRef.current = loc
                    toast.success(`📍 ${loc.label}`)
                    setCitySearchOpen(false)
                    setCitySearchValue('')
                  } else {
                    toast.info('Address not found')
                  }
                } catch (err: any) {
                  toast.error(`Search failed: ${err?.message || 'network error'}`)
                } finally {
                  setCitySearchLoading(false)
                }
              }}
              className="p-4 space-y-3"
            >
              {/* Tap-to-focus label so iOS users have a clear interaction target */}
              <label className="block">
                <span className="text-[10px] font-mono text-yellow-500/70 uppercase tracking-wider block mb-1">Tap below to type</span>
                <input
                  ref={citySearchInputRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  tabIndex={0}
                  value={citySearchValue}
                  onChange={(e) => setCitySearchValue(e.target.value)}
                  onFocus={(e) => e.currentTarget.scrollIntoView?.({ block: 'center', behavior: 'smooth' })}
                  placeholder="e.g. Times Square Manhattan"
                  // font-size: 16px is critical on iOS Safari — anything smaller
                  // triggers auto-zoom + can prevent keyboard from showing.
                  style={{ fontSize: '16px', WebkitAppearance: 'none', WebkitUserSelect: 'text', userSelect: 'text' }}
                  className="w-full bg-black border-2 border-yellow-500/40 rounded-lg px-4 py-4 font-mono text-yellow-100 placeholder:text-yellow-500/30 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-500/30"
                />
              </label>
              <div className="text-[11px] font-mono text-yellow-500/60 px-1 leading-relaxed">
                Try tapping one to fill the field:
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Times Square Manhattan', 'Shibuya Crossing Tokyo', 'Sunset Blvd LA', 'Brooklyn', 'Downtown Miami'].map((q) => (
                    <button key={q} type="button" onClick={() => {
                      setCitySearchValue(q)
                      citySearchInputRef.current?.focus()
                    }} className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!citySearchValue.trim() || citySearchLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/40 border-2 border-yellow-500/50 text-yellow-200 text-base font-mono font-bold hover:from-yellow-500/40 hover:to-orange-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {citySearchLoading ? '🔍 SEARCHING…' : '🚀 TELEPORT HERE'}
              </button>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* HUD */}
      <div className="absolute top-3 left-3 pointer-events-none space-y-1 max-w-[60vw]">
        <div className="px-2 py-1 rounded bg-black/70 backdrop-blur border border-yellow-500/30 text-[9px] font-mono text-yellow-400 truncate">
          🖼 GALLERY · @{ownerHandle} · {THEME_CONFIG[theme].name}
        </div>
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
          {stats.frames} frames · {stats.fps} fps · {stats.position}
        </div>
        {nowPlaying && (
          <div className="px-2 py-1 rounded bg-black/80 backdrop-blur border border-cyan-500/40 text-[9px] font-mono text-cyan-300 animate-pulse">
            ♪ {nowPlaying}
          </div>
        )}
        {/* Phase 16.17 — gamepad connection indicator */}
        {gamepadConnected && (
          <div className="px-2 py-1 rounded bg-emerald-500/15 backdrop-blur border border-emerald-500/40 text-[9px] font-mono text-emerald-300">
            🎮 GAMEPAD CONNECTED · L-stick to move
          </div>
        )}
        {/* Phase 16.26 — current city location HUD badge (set by search) */}
        {theme === 'city' && cityLocation && (
          <div className="px-2 py-1 rounded bg-yellow-500/15 backdrop-blur border border-yellow-500/40 text-[9px] font-mono text-yellow-300 max-w-[60vw] truncate">
            📍 {cityLocation.label}
          </div>
        )}
        {/* Phase 16.51 — basketball score HUD (now city + gym + blacktop) */}
        {(theme === 'city' || theme === 'gym' || theme === 'blacktop') && (
          <>
            <div className="px-2 py-1 rounded bg-orange-500/15 backdrop-blur border border-orange-500/40 text-[10px] font-mono text-orange-300 flex items-center gap-2">
              🏀 <span className="font-bold">{hoopScore.makes}</span>/<span>{hoopScore.attempts}</span>
              {hoopScore.streak >= 3 && (
                <span className={`ml-1 ${hoopScore.streak >= 7 ? 'text-red-400 animate-pulse' : hoopScore.streak >= 5 ? 'text-orange-400' : 'text-yellow-300'}`}>
                  🔥 {hoopScore.streak}{hoopScore.streak >= 7 ? ' COLD-BLOODED' : hoopScore.streak >= 5 ? ' HOT HAND' : ' GETTING HOT'}
                </span>
              )}
              {hoopScore.attempts > 0 && (
                <span className="ml-1 text-gray-400 text-[9px]">{Math.round((hoopScore.makes / hoopScore.attempts) * 100)}%</span>
              )}
            </div>
            {/* Phase 16.53 — shot clock + 2K-style quarter clock */}
            {(theme === 'gym' || theme === 'blacktop') && (() => {
              // 2K-style: session split into 4 quarters of 3 min each (game-to-21
              // typically runs <12 min so quarters cap nicely). Q indicator
              // gives the game a real broadcast feel.
              const QUARTER_LEN = 180
              const quarter = Math.min(4, Math.floor(sessionTime / QUARTER_LEN) + 1)
              const inQuarter = sessionTime % QUARTER_LEN
              const remain = QUARTER_LEN - inQuarter
              const m = Math.floor(remain / 60)
              const s = remain % 60
              return (
                <div className={`px-2 py-1 rounded backdrop-blur text-[10px] font-mono flex items-center gap-2 ${shotClock <= 5 ? 'bg-red-500/25 border border-red-500/50 text-red-300 animate-pulse' : 'bg-black/40 border border-white/15 text-gray-300'}`}>
                  <span className="font-bold">⏱ {shotClock}s</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-yellow-300 font-bold">Q{quarter}</span>
                  <span className="text-gray-400">{m}:{String(s).padStart(2, '0')}</span>
                </div>
              )
            })()}
            {/* Phase 16.56 — points scoreboard: first to 21 */}
            {(theme === 'gym' || theme === 'blacktop') && (
              <div className="px-2 py-1 rounded backdrop-blur text-[10px] font-mono flex items-center gap-1.5 bg-black/50 border border-white/20">
                <span className="text-cyan-300 font-bold">YOU {pointScore.player}</span>
                <span className="text-gray-600">—</span>
                <span className="text-red-400 font-bold">DEF {pointScore.defender}</span>
                <span className="text-gray-500 text-[8px] ml-1">to {POINTS_TO_WIN}</span>
              </div>
            )}
            {/* Phase 16.63 — platform badge: shows device + input mode so
                player knows which control hints apply. Also exposes that
                cross-platform is real — Xbox can play Switch can play
                iPhone all in the same WebRTC peer mesh. */}
            {(theme === 'gym' || theme === 'blacktop') && (
              <div className="px-2 py-1 rounded backdrop-blur text-[9px] font-mono flex items-center gap-1 bg-black/40 border border-white/15 text-gray-300">
                <span>{platformInfo.emoji}</span>
                <span className="font-bold uppercase">{platformInfo.label}</span>
                {platformInfo.inputMode === 'gamepad' && <span className="ml-0.5 text-emerald-400">·🎮</span>}
              </div>
            )}
            {/* Phase 16.64 — NBA 2K-style camera preset cycle. Tap to cycle,
                or press Tab (keyboard) / D-pad Up (gamepad). */}
            {(theme === 'gym' || theme === 'blacktop') && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = CAMERA_PRESETS.indexOf(cameraPreset)
                  setCameraPreset(CAMERA_PRESETS[(idx + 1) % CAMERA_PRESETS.length])
                }}
                className="pointer-events-auto px-2 py-1 rounded backdrop-blur text-[9px] font-mono flex items-center gap-1 bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25 transition"
                aria-label="Cycle camera view"
              >
                🎥 <span className="font-bold uppercase">{cameraPreset}</span> <span className="text-cyan-400/60 text-[8px]">[TAB]</span>
              </button>
            )}
            {/* Phase 16.59 — difficulty pills + pause */}
            {(theme === 'gym' || theme === 'blacktop') && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-[9px] font-mono mr-1">DIFF</span>
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase transition ${difficulty === d ? (d === 'easy' ? 'bg-green-500/30 text-green-300 border border-green-400/50' : d === 'hard' ? 'bg-red-500/30 text-red-300 border border-red-400/50' : 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/50') : 'bg-white/[0.04] text-gray-500 border border-white/10 hover:text-white'}`}
                  >
                    {d[0]}
                  </button>
                ))}
                <button
                  onClick={() => setPaused((p) => !p)}
                  className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition ${paused ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/50' : 'bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white'}`}
                  aria-label={paused ? 'Resume' : 'Pause'}
                >
                  {paused ? '▶' : '⏸'}
                </button>
              </div>
            )}
          </>
        )}
        {/* Phase 16.29 — city search is now a TAP-TO-OPEN MODAL.
            Inline-input approach kept getting blocked by canvas z-index +
            pointer-event quirks on mobile Safari. Modal sidesteps it. */}
        {theme === 'city' && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setCitySearchOpen(true) }}
            className="pointer-events-auto px-3 py-1.5 rounded bg-yellow-500/15 backdrop-blur border border-yellow-500/40 text-[11px] font-mono text-yellow-300 hover:bg-yellow-500/25 flex items-center gap-1.5"
          >
            🌍 SEARCH CITY / STREET
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none hidden sm:block">
        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-500">
          WASD or 🎮 left-stick walk · click frame for details · approach to hear audio
        </div>
      </div>

      {/* Bottom pills — SHARE + INVITE + CUSTOMIZE */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
        {/* SHARE — copy link or native share sheet on mobile */}
        <button
          onClick={() => {
            const url = `${window.location.origin}/gallery3d?handle=${ownerHandle}`
            // Use native share on mobile (iOS/Android), clipboard on desktop
            if (typeof navigator.share === 'function') {
              navigator.share({ title: `${ownerHandle}'s Gallery`, text: 'Come visit my Gallery on SoundChain!', url }).catch(() => {})
              toast.success('Share sheet opened!')
            } else {
              // Clipboard fallback with textarea trick (works on all browsers)
              const ta = document.createElement('textarea')
              ta.value = url
              ta.style.position = 'fixed'
              ta.style.opacity = '0'
              document.body.appendChild(ta)
              ta.select()
              document.execCommand('copy')
              document.body.removeChild(ta)
              toast.success('Gallery link copied!')
            }
          }}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-mono font-bold hover:bg-cyan-500/30 transition backdrop-blur active:scale-95"
        >
          <Copy className="w-3 h-3" /> SHARE
        </button>
        {/* INVITE — post to Nodes feed */}
        <button
          onClick={async () => {
            if (inviting) return
            setInviting(true)
            const tid = toast.loading('Posting invite to feed…')
            try {
              const url = `${window.location.origin}/gallery3d?handle=${ownerHandle}`
              const r = await fetch('/api/feed/create', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  body: `🖼 Come visit my Gallery!\n\nWalk through, check out my collection, vibe to the music.\n\n👉 ${url}`,
                }),
              })
              if (r.ok) toast.update(tid, { render: 'Gallery invite posted to feed!', type: 'success', isLoading: false, autoClose: 3000 })
              else toast.update(tid, { render: 'Post failed — are you logged in?', type: 'error', isLoading: false, autoClose: 4000 })
            } catch {
              toast.update(tid, { render: 'Post failed — check connection', type: 'error', isLoading: false, autoClose: 4000 })
            } finally {
              setInviting(false)
            }
          }}
          disabled={inviting}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[9px] font-mono font-bold hover:bg-purple-500/30 transition backdrop-blur active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-3 h-3" /> {inviting ? 'POSTING…' : 'INVITE'}
        </button>
        {/* CUSTOMIZE — furniture */}
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[9px] font-mono font-bold hover:bg-yellow-500/30 transition backdrop-blur active:scale-95"
        >
          <Paintbrush className="w-3 h-3" /> CUSTOMIZE
        </button>
        {/* Phase 16.66 — Ready Player Me avatar */}
        <button
          onClick={() => setShowRpm(true)}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-mono font-bold hover:bg-cyan-500/30 transition backdrop-blur active:scale-95"
        >
          <UserCog className="w-3 h-3" /> AVATAR
        </button>
        {/* Phase 16.67 — Character Designer entry point */}
        <button
          onClick={() => setShowDesigner(true)}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-400 text-[9px] font-mono font-bold hover:bg-pink-500/30 transition backdrop-blur active:scale-95"
        >
          <Sparkles className="w-3 h-3" /> DESIGN
        </button>
      </div>

      {/* Furniture placement count — dismissable */}
      {placedFurniture.length > 0 && !hideFurnitureCount && (
        <div className="absolute bottom-14 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[8px] font-mono text-gray-400">
          {placedFurniture.length} items placed
          <button onClick={() => setHideFurnitureCount(true)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Phase 16.67 — CHARACTER DESIGNER MODAL. Full AI BUILD + face
          designer + outfit tabs, in-gym. Closing the modal triggers
          'character-updated' via CharacterDesigner's own save flow, which
          GalleryRoom3D already subscribes to (line ~3404) — that calls
          buildAvatar(getStoredCharacter()) and rebuilds the player with
          the new look. */}
      <CharacterDesigner open={showDesigner} onClose={() => setShowDesigner(false)} />
      {/* Phase 16.66 — READY PLAYER ME MODAL. Hosts the RPM creator in
          an iframe; RPM postMessages back the rigged GLB URL when the
          user exports. We save it as humanGlbUrl on the local character
          config and dispatch character-updated so buildAvatar reloads
          the gym with the new avatar. The skeleton is Mixamo-compatible
          so any animations we wire up later inherit cleanly. */}
      {showRpm && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowRpm(false)}>
          <div className="w-full max-w-2xl bg-[#0a0f1f] border border-cyan-500/30 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-black/40">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-400">READY PLAYER ME — AVATAR</span>
              </div>
              <button onClick={() => setShowRpm(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="text-[10px] font-mono text-gray-400 px-4 py-2 border-b border-white/5 bg-black/20">
              Design an avatar. When you tap "Done" in the creator, your rigged 3D model loads into the gym automatically.
            </div>
            <iframe
              ref={(el) => {
                if (!el) return
                // RPM frameApi messages — request the avatar.exported event
                const onLoad = () => {
                  try {
                    el.contentWindow?.postMessage(
                      JSON.stringify({ target: 'readyplayerme', type: 'subscribe', eventName: 'v1.**' }),
                      '*',
                    )
                  } catch {}
                }
                el.addEventListener('load', onLoad, { once: true })
              }}
              src="https://demo.readyplayer.me/avatar?frameApi&clearCache"
              allow="camera *; microphone *; clipboard-write"
              className="flex-1 w-full min-h-[480px] bg-black"
              title="Ready Player Me avatar creator"
            />
          </div>
        </div>
      )}
      {/* CUSTOMIZE MODAL — furniture catalog */}
      {showCustomize && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCustomize(false)}>
          <div className="w-full max-w-lg bg-[#0a0f1f] border border-yellow-500/30 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/20 bg-black/40 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">CUSTOMIZE GALLERY</span>
                <span className="text-[8px] font-mono text-gray-600">{placedFurniture.length} items</span>
              </div>
              <button onClick={() => setShowCustomize(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-black/20 overflow-x-auto">
              {FURNITURE_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setFurnitureCategory(c.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap transition ${furnitureCategory === c.id ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:text-white'}`}
                >{c.emoji} {c.label}</button>
              ))}
            </div>

            {/* Furniture grid */}
            <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[35vh] overflow-y-auto">
              {filterByCategory(furnitureCategory).map(item => (
                <button key={item.id} onClick={() => addFurniture(item.id)}
                  className="group flex flex-col items-center gap-1 p-3 rounded border border-white/10 hover:border-yellow-500/40 bg-white/[0.02] hover:bg-yellow-500/5 transition"
                >
                  <div className="text-3xl group-hover:scale-110 transition-transform">{item.emoji}</div>
                  <div className="text-[9px] font-mono text-white text-center truncate w-full">{item.name}</div>
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.color }} />
                </button>
              ))}
            </div>

            {/* Placed items list — remove button */}
            {placedFurniture.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 max-h-[15vh] overflow-y-auto">
                <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">Placed Items</div>
                <div className="space-y-1">
                  {placedFurniture.map((pf, i) => {
                    const item = getFurnitureById(pf.itemId)
                    return (
                      <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-black/40 border border-white/5">
                        <span className="text-[9px] font-mono text-gray-400">{item?.emoji} {item?.name}</span>
                        <button onClick={() => removeFurniture(i)} className="text-[8px] font-mono text-red-400 hover:text-red-300">remove</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="px-4 py-2 border-t border-white/5 bg-black/40 text-[8px] font-mono text-gray-600">
              Tap any item to place it randomly in your gallery. Furniture saves to your device.
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center space-y-2">
            <div className="text-yellow-400 font-mono text-sm animate-pulse">LOADING GALLERY...</div>
            <div className="text-gray-600 font-mono text-[10px]">Hanging frames on the walls</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tracks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="text-center space-y-2 max-w-md p-6">
            <div className="text-yellow-400 font-mono text-sm">EMPTY GALLERY</div>
            <div className="text-gray-500 font-mono text-[10px]">@{ownerHandle} hasn't uploaded any tracks yet</div>
          </div>
        </div>
      )}

      {/* Frame detail modal */}
      {selectedTrack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setSelectedTrack(null)}>
          <div className="w-full max-w-sm sm:max-w-md bg-[#0a0f1f] border border-yellow-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Header — sticky, always shows X chevron */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-yellow-500/20 bg-black/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-yellow-400">FRAME DETAIL</span>
              </div>
              <button onClick={() => setSelectedTrack(null)} className="p-1.5 hover:bg-white/10 rounded-full border border-white/10" aria-label="Close">
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            {/* Scrollable body — artwork + playbar + meta all live here, footer stays reachable */}
            <div className="flex-1 overflow-y-auto">
              {/* Artwork — shrunk on mobile so the card isn't a full-screen render */}
              <div className="h-40 sm:aspect-square sm:h-auto bg-black relative">
                {selectedTrack.artworkUrl ? (
                  <img src={selectedTrack.artworkUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-purple-900/30 flex items-center justify-center">
                    <Music className="w-12 h-12 text-yellow-500/30" />
                  </div>
                )}
              </div>
              {/* Inline canonical AudioPlayer — plays IN this card, not in the bottom sticky bar.
                  Stop all proximity-audio first so the scene loop doesn't fight this player. */}
              {(selectedTrack.playbackUrl || selectedTrack.audioUrl) && (
                <div
                  className="p-3 bg-black"
                  onClickCapture={() => {
                    audioRefsMap.current.forEach(a => { try { a.pause(); a.currentTime = 0 } catch {} })
                  }}
                >
                  <AudioPlayer
                    src={(selectedTrack.playbackUrl || selectedTrack.audioUrl) as string}
                    title={selectedTrack.title}
                    artist={selectedTrack.artist || ownerHandle}
                    art={selectedTrack.artworkUrl}
                    trackId={selectedTrack.id}
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h3 className="text-lg font-mono font-bold text-white">{selectedTrack.title}</h3>
                <p className="text-sm font-mono text-gray-400">{selectedTrack.artist || ownerHandle}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
                  {selectedTrack.isNFT && <span className="text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">NFT</span>}
                  {selectedTrack.editionSize && selectedTrack.editionSize > 1 && <span className="text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">1/{selectedTrack.editionSize}</span>}
                  {selectedTrack.ipfsHash && <span className="text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">IPFS</span>}
                  {(selectedTrack.playbackUrl || selectedTrack.audioUrl) && <span className="text-green-400 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">▶ audio</span>}
                  {!(selectedTrack.playbackUrl || selectedTrack.audioUrl) && <span className="text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">no audio</span>}
                </div>
                {/* Track details — stays in this card, never redirects */}
                <div className="p-2 rounded bg-black/40 border border-white/5 text-[9px] font-mono text-gray-500 space-y-1">
                  <div className="flex justify-between"><span>Track ID</span><span className="text-gray-400">{selectedTrack.id.slice(0, 12)}...</span></div>
                  {selectedTrack.artist && <div className="flex justify-between"><span>Artist</span><span className="text-cyan-400">@{selectedTrack.artist}</span></div>}
                  <div className="flex justify-between"><span>Audio</span><span className="text-gray-400 truncate max-w-[180px]">{selectedTrack.playbackUrl || selectedTrack.audioUrl || 'none'}</span></div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {/* Save to archive */}
                  <button
                    onClick={() => {
                      fetch('/api/feed/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bookmark', trackId: selectedTrack.id }) }).catch(() => {})
                      toast.success('Saved to your archive!')
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono hover:bg-amber-500/30 transition"
                  >
                    <Heart className="w-3 h-3" /> Save
                  </button>
                  {/* Share — copy link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/track/${selectedTrack.id}`)
                      toast.success('Link copied!')
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-white/5 border border-white/10 text-gray-400 text-[10px] font-mono hover:bg-white/10 transition"
                  >
                    <Copy className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
