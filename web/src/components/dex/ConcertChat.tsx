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
} from '@/lib/nostr/concertChat'

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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<{ close: () => void } | null>(null)

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

        // Subscribe to chat
        const sub = subscribeToConcertChat(geohash, (msg) => {
          if (!isMounted) return

          seenPubkeys.add(msg.pubkey)
          setUserCount(seenPubkeys.size)

          const chatMsg: ChatMessage = {
            ...msg,
            isOwn: msg.pubkey === userIdentity.publicKey,
            displayName: `User ${msg.pubkey.substring(0, 8)}`,
          }

          setMessages((prev) => {
            // Dedupe and sort by timestamp
            const existing = prev.find((m) => m.id === msg.id)
            if (existing) return prev
            return [...prev, chatMsg].sort((a, b) => a.timestamp - b.timestamp)
          })
        })

        subscriptionRef.current = sub
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
    }
  }, [venue, precision])

  // Send message handler
  const handleSend = async () => {
    if (!input.trim() || !identity || !currentGeohash) return

    const messageText = input.trim()
    setInput('')

    try {
      await sendConcertMessage(identity, currentGeohash, messageText)
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
        <p className="text-gray-400 text-sm">Connecting to location chat...</p>
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
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Wifi className="w-3 h-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users className="w-4 h-4" />
            <span>{userCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <MapPin className="w-4 h-4" />
          <span>{locationName || currentGeohash}</span>
        </div>
      </div>

      {/* Bitchat Promo Banner */}
      {showBitchatPromo && (
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
                <button
                  onClick={openInBitchat}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Bitchat
                </button>

                <a
                  href={getBitchatAppStoreLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Get Bitchat App
                </a>
              </div>

              <p className="text-xs text-gray-400">
                Bitchat enables offline Bluetooth mesh networking at concerts,
                festivals, and events. Even without internet!
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
            <p>No messages yet</p>
            <p className="text-xs mt-1">Be the first to say hello!</p>
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
            placeholder="Message this location..."
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
          Messages visible to everyone at this location via Nostr
        </p>
      </div>
    </div>
  )
}

export default ConcertChat
