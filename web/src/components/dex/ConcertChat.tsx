/**
 * ConcertChat - Location-based chat component using Nostr protocol
 *
 * Interoperable with Bitchat app! Users on SoundChain and Bitchat
 * can see each other's messages in the same geohash channel.
 *
 * Features:
 * - Real-time location-based chat via Nostr relays
 * - Geohash-based channels (same as Bitchat)
 * - "Open in Bitchat" deep link for offline mesh support
 * - Auto-detect user location for nearby chat
 * - Works at concerts, festivals, events, or anywhere!
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle,
  MapPin,
  Send,
  Radio,
  ExternalLink,
  Download,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  subscribeToConcertChat,
  sendConcertMessage,
  getOrCreateIdentity,
  getVenueGeohash,
  getCurrentGeohash,
  getGeohashDescription,
  getBitchatDeepLink,
  getBitchatAppStoreLink,
  GEOHASH_PRECISION,
  type NostrMessage,
  type NostrIdentity,
  type VenueLocation,
} from 'lib/nostr/concertChat'
import {
  BridgeClient,
  isBridgeAvailable,
  type ConnectionMode,
  type MeshStatus,
  type NearbyDevice,
} from 'lib/nostr/bridgeClient'

interface ConcertChatProps {
  /** Optional fixed venue location. If not provided, uses user's current location */
  venue?: VenueLocation
  /** Geohash precision level (default: STAGE ~150m) */
  precision?: number
  /** Whether to show the Bitchat promotion banner */
  showBitchatPromo?: boolean
  /** Custom CSS class */
  className?: string
  /** Compact mode for sidebar/modal usage */
  compact?: boolean
}

interface ChatMessage extends NostrMessage {
  isOwn: boolean
  displayName: string
}

// Helper to detect mobile iOS devices
const useIsMobileIOS = () => {
  const [isMobileIOS, setIsMobileIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    setIsMobileIOS(isIOS)
    setIsMobile(isMobileDevice)
  }, [])

  return { isMobileIOS, isMobile }
}

export function ConcertChat({
  venue,
  precision = GEOHASH_PRECISION.STAGE,
  showBitchatPromo = true,
  className = '',
  compact = false,
}: ConcertChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [currentGeohash, setCurrentGeohash] = useState<string | null>(null)
  const [identity, setIdentity] = useState<NostrIdentity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [showBitchatInfo, setShowBitchatInfo] = useState(false)
  const [locationName, setLocationName] = useState<string>('')
  const [bitchatAppChecked, setBitchatAppChecked] = useState(false)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected')
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([])
  const [bridgeChecked, setBridgeChecked] = useState(false)
  const [bridgePromoDismissed, setBridgePromoDismissed] = useState(false)

  const { isMobileIOS, isMobile } = useIsMobileIOS()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<{ close: () => void } | null>(null)
  const bridgeClientRef = useRef<BridgeClient | null>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize location and subscription
  useEffect(() => {
    let isMounted = true

    const initChat = async () => {
      setIsConnecting(true)
      setError(null)

      try {
        let geohash: string

        if (venue) {
          // Use provided venue location
          geohash = getVenueGeohash(venue, precision)
          setLocationName(venue.name)
        } else {
          // Auto-detect user location
          const detected = await getCurrentGeohash(precision)
          if (!detected) {
            setError('Could not detect your location. Please enable location access.')
            setIsConnecting(false)
            return
          }
          geohash = detected
          setLocationName(getGeohashDescription(geohash))
        }

        if (!isMounted) return

        setCurrentGeohash(geohash)

        // Get or create Nostr identity (different per region for privacy)
        const userIdentity = getOrCreateIdentity(geohash)
        setIdentity(userIdentity)

        // Track unique pubkeys for user count
        const seenPubkeys = new Set<string>()

        // Message handler for both bridge and nostr
        const handleMessage = (msg: NostrMessage) => {
          if (!isMounted) return

          seenPubkeys.add(msg.pubkey)
          setUserCount(seenPubkeys.size)

          const chatMsg: ChatMessage = {
            ...msg,
            isOwn: msg.pubkey === userIdentity.publicKey,
            displayName: `User ${msg.pubkey.substring(0, 8)}`,
          }

          setMessages((prev) => {
            const existing = prev.find((m) => m.id === msg.id)
            if (existing) return prev
            return [...prev, chatMsg].sort((a, b) => a.timestamp - b.timestamp)
          })
        }

        // Try Bridge first (for Bluetooth mesh), fall back to Nostr relays
        console.log('🌉 Checking for Bridge app...')
        setBridgeChecked(false)

        const bridgeClient = new BridgeClient({
          geohash,
          onMessage: handleMessage,
          onConnectionModeChange: (mode) => {
            console.log('🌉 Connection mode:', mode)
            setConnectionMode(mode)
          },
          onDeviceFound: (device) => {
            console.log('🌉 Device found:', device.name)
            setNearbyDevices(prev => {
              const exists = prev.find(d => d.id === device.id)
              if (exists) return prev
              return [...prev, device]
            })
          },
          onMeshStatus: (status) => {
            console.log('🌉 Mesh status:', status)
            setNearbyDevices(status.devices || [])
          }
        })

        bridgeClientRef.current = bridgeClient
        const mode = await bridgeClient.connect()
        setBridgeChecked(true)

        if (mode === 'bridge') {
          console.log('🌉 Connected via Bridge (Bluetooth mesh)!')
        } else {
          console.log('📡 Using Nostr relays (internet)')
          // Also subscribe via Nostr as backup/supplement
          const sub = subscribeToConcertChat(geohash, handleMessage)
          subscriptionRef.current = sub
        }

        setIsConnected(true)
        setIsConnecting(false)
      } catch (err) {
        console.error('Concert chat init error:', err)
        if (isMounted) {
          setError('Failed to connect to chat. Please try again.')
          setIsConnecting(false)
        }
      }
    }

    initChat()

    return () => {
      isMounted = false
      subscriptionRef.current?.close()
      // Cleanup bridge client on unmount
      bridgeClientRef.current?.disconnect()
    }
  }, [venue, precision])

  // Send message handler - uses Bridge if connected, otherwise Nostr
  const handleSend = async () => {
    if (!input.trim() || !identity || !currentGeohash) return

    const messageText = input.trim()
    setInput('')

    try {
      // Use Bridge if connected, otherwise fall back to Nostr
      if (bridgeClientRef.current && connectionMode === 'bridge') {
        console.log('🌉 Sending via Bridge (Bluetooth mesh)')
        await bridgeClientRef.current.sendMessage(messageText)
      } else {
        console.log('📡 Sending via Nostr relays')
        await sendConcertMessage(identity, currentGeohash, messageText)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message. Please try again.')
    }
  }

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Open Bitchat app
  const openInBitchat = () => {
    if (currentGeohash) {
      window.location.href = getBitchatDeepLink(currentGeohash)
    }
  }

  // Render loading state
  if (isConnecting) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-400 text-sm">
          {!bridgeChecked ? '🌉 Checking for Bridge app...' : 'Finding nearby users...'}
        </p>
      </div>
    )
  }

  // Render error state
  if (error && !isConnected) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <WifiOff className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-neutral-900 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-700 bg-neutral-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">Location Chat</span>
            {isConnected ? (
              connectionMode === 'bridge' ? (
                <span className="flex items-center gap-1 text-xs text-purple-400" title="Connected via Bluetooth mesh">
                  <span>🌉</span> Bridge
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-green-400" title="Connected via Internet">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            {connectionMode === 'bridge' && nearbyDevices.length > 0 && (
              <span className="flex items-center gap-1 text-purple-400" title="Nearby Bluetooth devices">
                <span>📶</span>
                <span>{nearbyDevices.length}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{userCount}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <MapPin className="w-4 h-4" />
          <span>{locationName || currentGeohash}</span>
        </div>
      </div>

      {/* Bridge App Promo - Shows when bridge not detected on mobile */}
      {bridgeChecked && connectionMode !== 'bridge' && isMobile && !bridgePromoDismissed && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 border-b border-purple-400 relative">
          <button
            onClick={() => setBridgePromoDismissed(true)}
            className="absolute top-2 right-2 p-1 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center">
              <span className="text-2xl">🌉</span>
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-bold text-white text-lg">Enable Bluetooth Mesh</h3>
              <p className="text-purple-200 text-xs">True decentralized messaging</p>
            </div>
          </div>

          <p className="text-white/90 text-sm mb-4">
            Get the <strong>SoundChain Bridge</strong> app to chat with nearby users via Bluetooth - no internet required! Works with Bitchat users too.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <span>✓</span>
              <span>Chat without internet connection</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <span>✓</span>
              <span>Connect with Bitchat mesh network</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs">
              <span>✓</span>
              <span>Perfect for concerts, festivals, events</span>
            </div>
          </div>

          <a
            href="https://testflight.apple.com/join/soundchain-bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-gray-100 transition-colors w-full"
          >
            <Download className="w-5 h-5" />
            Get Bridge App (iOS)
          </a>

          <p className="text-xs text-white/50 mt-3 text-center">
            Currently in beta via TestFlight
          </p>
        </div>
      )}

      {/* Mobile iOS Bitchat Banner - Prominent */}
      {showBitchatPromo && isMobileIOS && currentGeohash && (
        <div className="bg-gradient-to-r from-purple-600 to-cyan-600 p-4 border-b border-cyan-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center">
              <span className="text-2xl">📡</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">Open in Bitchat</h3>
              <p className="text-cyan-100 text-xs">Jack Dorsey's mesh network app</p>
            </div>
          </div>

          <p className="text-white/90 text-sm mb-4">
            Continue chatting with nearby users in Bitchat for offline Bluetooth mesh support!
          </p>

          <div className="flex gap-2">
            <button
              onClick={openInBitchat}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open in Bitchat
            </button>

            <a
              href={getBitchatAppStoreLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-4 py-3 bg-black/30 text-white rounded-xl hover:bg-black/40 transition-colors"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>

          <p className="text-xs text-white/60 mt-3 text-center">
            Messages sync between SoundChain and Bitchat via Nostr protocol
          </p>
        </div>
      )}

      {/* Desktop/Android Bitchat Promo Banner - Collapsible */}
      {showBitchatPromo && !isMobileIOS && (
        <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 border-b border-neutral-700">
          <button
            onClick={() => setShowBitchatInfo(!showBitchatInfo)}
            className="w-full p-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📡</span>
              <span className="text-sm text-gray-200">
                Powered by Nostr + Bitchat
              </span>
            </div>
            {showBitchatInfo ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showBitchatInfo && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-gray-300">
                This chat uses the same protocol as{' '}
                <strong className="text-cyan-400">Bitchat</strong> (by Jack Dorsey).
                Messages are shared across both platforms!
              </p>

              <div className="flex flex-wrap gap-2">
                {isMobile && (
                  <button
                    onClick={openInBitchat}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Bitchat
                  </button>
                )}

                <a
                  href={getBitchatAppStoreLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isMobile ? 'Get Bitchat' : 'Get Bitchat (iOS)'}
                </a>
              </div>

              <p className="text-xs text-gray-400">
                {isMobile
                  ? 'Bitchat enables offline Bluetooth mesh networking - chat with nearby users even without internet!'
                  : 'Bitchat (iOS) enables offline Bluetooth mesh networking to chat with nearby users.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${compact ? 'max-h-64' : 'min-h-[300px]'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p>No nearby users yet</p>
            <p className="text-xs mt-1">Be the first to say hello to your area!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.isOwn
                    ? 'bg-cyan-600 text-white rounded-br-md'
                    : 'bg-neutral-700 text-gray-100 rounded-bl-md'
                }`}
              >
                {!msg.isOwn && (
                  <p className="text-xs text-gray-400 mb-1">{msg.displayName}</p>
                )}
                <p className="break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.isOwn ? 'text-cyan-200' : 'text-gray-500'}`}>
                  {new Date(msg.timestamp * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-700 bg-neutral-800/50">
        {error && (
          <div className="flex items-center justify-between mb-2 p-2 bg-red-500/20 rounded-lg">
            <p className="text-red-400 text-xs">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message nearby users..."
            className="flex-1 bg-neutral-700 text-white px-4 py-3 rounded-full placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={!isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          {connectionMode === 'bridge' ? (
            <>🌉 Bluetooth mesh active - synced with Bitchat</>
          ) : (
            <>Messages visible to nearby users via Nostr &amp; Bitchat</>
          )}
        </p>
      </div>
    </div>
  )
}

export default ConcertChat
