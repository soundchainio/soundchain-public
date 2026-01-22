/**
 * NearbyChatDropdown - Header dropdown for Nearby/Nostr messages
 *
 * Shows recent messages from the Nostr network in a dropdown,
 * similar to how the Bridge app displays "Messages Bridged".
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Radio, MessageCircle, Globe, Wifi } from 'lucide-react'
import {
  subscribeToConcertChat,
  getCurrentGeohash,
  getOrCreateIdentity,
  sendConcertMessage,
  getGeohashDescription,
  type NostrMessage,
  type NostrIdentity,
  GEOHASH_PRECISION,
} from 'lib/nostr/concertChat'

interface ChatMessage extends NostrMessage {
  isOwn: boolean
}

// Badge component for unread count
export const NearbyChatBadge = ({ count }: { count: number }) => {
  if (count === 0) return null

  return (
    <div className="absolute -right-1 -top-1 h-4 min-w-4 px-1 rounded-full bg-green-500 text-center text-[10px] font-bold text-black flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </div>
  )
}

// Icon component for the header
export const NearbyChatIcon = () => (
  <div className="relative">
    <Radio className="w-5 h-5 text-cyan-400" />
  </div>
)

// Main dropdown content
export const NearbyChatDropdown = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [currentGeohash, setCurrentGeohash] = useState<string | null>(null)
  const [identity, setIdentity] = useState<NostrIdentity | null>(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const subscriptionRef = useRef<{ close: () => void } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize Nostr connection
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Get current location geohash (precision 6 = ~1.2km)
        const geohash = await getCurrentGeohash(GEOHASH_PRECISION.VENUE)
        if (!geohash || !mounted) return

        setCurrentGeohash(geohash)

        // Get or create Nostr identity
        const id = getOrCreateIdentity(geohash)
        setIdentity(id)

        // Subscribe to messages
        const handleMessage = (msg: NostrMessage) => {
          if (!mounted) return

          const chatMsg: ChatMessage = {
            ...msg,
            isOwn: msg.pubkey === id.publicKey,
          }

          setMessages(prev => {
            // Dedupe by ID
            if (prev.some(m => m.id === chatMsg.id)) return prev
            // Keep last 50 messages, newest first
            const updated = [chatMsg, ...prev].slice(0, 50)
            return updated
          })
        }

        subscriptionRef.current = subscribeToConcertChat(geohash, handleMessage)
        setIsConnected(true)

      } catch (err) {
        console.error('Nearby chat init error:', err)
      }
    }

    init()

    return () => {
      mounted = false
      subscriptionRef.current?.close()
    }
  }, [])

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || !identity || !currentGeohash || isSending) return

    setIsSending(true)
    try {
      await sendConcertMessage(identity, currentGeohash, input.trim())
      setInput('')
    } catch (err) {
      console.error('Failed to send:', err)
    } finally {
      setIsSending(false)
    }
  }, [input, identity, currentGeohash, isSending])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const truncatePubkey = (pubkey: string) => `${pubkey.slice(0, 8)}...`

  return (
    <div className="w-80 max-h-96 bg-gray-900 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Nearby Chat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
        {currentGeohash && (
          <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {getGeohashDescription(currentGeohash)}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="h-56 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Wifi className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No nearby messages yet</p>
            <p className="text-xs">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-lg ${
                msg.isOwn
                  ? 'bg-cyan-900/30 border border-cyan-700/30 ml-4'
                  : 'bg-gray-800/50 border border-gray-700/30 mr-4'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-500" />
                  {msg.isOwn ? 'You' : truncatePubkey(msg.pubkey)}
                </span>
                <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-sm text-white break-words">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700 bg-gray-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message nearby users..."
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            disabled={!isConnected || isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected || isSending}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-gray-500 text-center">
          Powered by Nostr + Bitchat
        </p>
      </div>
    </div>
  )
}

export default NearbyChatDropdown
