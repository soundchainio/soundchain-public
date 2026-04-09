/**
 * SoundChain Pulse — Real-Time Messaging & Notification PWA
 *
 * WhatsApp-dark themed messaging hub. Standalone page for clean PWA scope.
 * Real-time via OpenClaw gateway WebSocket, NIP-17 encryption via Nostr.
 *
 * Layout:
 *   Mobile: single column — list → chat → notifications (swipe/tap)
 *   Desktop (lg+): sidebar conversations + main chat thread
 */

import { useState, useRef, useEffect, useCallback, useMemo, ReactElement } from 'react'
import { gql, useMutation } from '@apollo/client'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { formatDistanceToNow } from 'date-fns'
import { toast, ToastContainer } from 'react-toastify'
import { playNotificationChime, warmUpAudio } from 'utils/notificationChime'
import {
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Copy,
  Download,
  Edit,
  MessageCircle,
  Reply,
  Search,
  Send,
  Settings,
  Share as ShareIcon,
  Share2,
  Smile,
  Image as ImageIcon,
  Sticker,
  X,
  Wifi,
  WifiOff,
  Heart,
  Users,
  DollarSign,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import Link from 'next/link'
import { Avatar } from 'components/Avatar'
import { SubtleGlowLogo } from 'icons/GlowingLogo'
import { useOpenClawGateway } from 'hooks/useOpenClawGateway'
import { usePushNotifications } from 'hooks/usePushNotifications'
import {
  useMeQuery,
  useChatsQuery,
  useChatHistoryLazyQuery,
  useSendMessageMutation,
  useResetUnreadMessageCountMutation,
  useUnreadMessageCountLazyQuery,
  useExploreUsersLazyQuery,
  ChatsDocument,
} from 'lib/graphql'

import { EmoteRenderer } from 'components/EmoteRenderer'
import { useWebRTCCall, type CallMode } from 'hooks/useWebRTCCall'
const PulseNotificationFeed = dynamic(() => import('components/pulse/PulseNotificationFeed'), { ssr: false })
const EmojiPicker = dynamic(() => import('@emoji-mart/react').then((m) => m.default), { ssr: false })
const StickerPicker = dynamic(() => import('components/StickerPicker').then((m) => m.StickerPicker), { ssr: false })
const GifPicker = dynamic(() => import('components/GifPicker').then((m) => m.GifPicker), { ssr: false })
const CallUI = dynamic(() => import('components/dex/CallUI').then((m) => m.CallUI), { ssr: false })
const CallButton = dynamic(() => import('components/dex/CallUI').then((m) => m.CallButton), { ssr: false })
const MiniSphere = dynamic(() => import('components/MiniSphere').then(m => m.MiniSphere), { ssr: false })

const TEST_PUSH = gql`mutation TestPush { testPushNotification }`
const SEND_TYPING = gql`mutation SendTypingIndicator($toId: String!) { sendTypingIndicator(toId: $toId) }`

// iMessage-style typing dots animation
function TypingDots() {
  return (
    <div className="flex items-start">
      <div className="rounded-lg rounded-tl-sm px-3 py-2" style={{ backgroundColor: WA.bubble_recv }}>
        <div className="flex items-center gap-1 h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full"
              style={{
                backgroundColor: WA.text_secondary,
                animation: `pulseTyping 1.4s infinite ease-in-out`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes pulseTyping {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// WhatsApp dark palette
const WA = {
  bg: '#0b141a',
  bgDarker: '#060d11',
  header: '#1f2c34',
  bubble_sent: '#005c4b',
  bubble_recv: '#1f2c34',
  input: '#1f2c34',
  border: '#2a3942',
  text: '#e9edef',
  text_secondary: '#8696a0',
  accent: '#00a884',
  accent_hover: '#00d4a4',
  search_bg: '#111b21',
}

type Tab = 'chats' | 'notifications'
type View = 'list' | 'chat'

interface ChatItem {
  id: string
  profileId: string
  displayName: string
  userHandle: string | null
  profilePicture: string | null
  lastMessage: string
  unread: boolean
  createdAt: string
  verified?: boolean | null
  isOnline?: boolean
}

function PulsePage() {
  const router = useRouter()
  const { data: meData, loading: meLoading } = useMeQuery()
  const me = meData?.me
  const [tab, setTab] = useState<Tab>((router.query.tab as Tab) || 'chats')
  const [view, setView] = useState<View>('list')
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null)
  // Pre-fill message from share target (iOS/Android share sheet → Pulse)
  const sharedText = typeof router.query.text === 'string' ? router.query.text : ''
  const sharedUrl = typeof router.query.url === 'string' ? router.query.url : ''
  const sharePayload = [sharedText, sharedUrl].filter(Boolean).join(' ')
  const [messageText, setMessageText] = useState(sharePayload || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showGifs, setShowGifs] = useState(false)
  const [showNewChat, setShowNewChat] = useState(!!sharePayload || router.query.new === '1')
  const [newChatSearch, setNewChatSearch] = useState('')
  const [pushDismissed, setPushDismissed] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushJustEnabled, setPushJustEnabled] = useState(false)
  const [showPushSettings, setShowPushSettings] = useState(false)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [peerTyping, setPeerTyping] = useState(false)
  // Platform detection — must use state+effect to avoid SSR hydration mismatch in PWA standalone
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const prevMsgCountRef = useRef(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastTypingSentRef = useRef(0)
  const isUserTypingRef = useRef(false)
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const newChatInputRef = useRef<HTMLInputElement>(null)

  // Push notifications
  const { permission: pushPermission, isSubscribed: pushSubscribed, isSupported: pushSupported, subscribe: pushSubscribe, error: pushHookError } = usePushNotifications()
  const [pushLoading, setPushLoading] = useState(false)
  const [testPush, { loading: testPushLoading }] = useMutation(TEST_PUSH)
  const [testPushResult, setTestPushResult] = useState<string | null>(null)

  // User search for new chat
  const [searchUsers, { data: searchData, loading: searchLoading }] = useExploreUsersLazyQuery({ fetchPolicy: 'network-only' })

  // Debounced user search
  useEffect(() => {
    if (!newChatSearch.trim() || newChatSearch.trim().length < 1) return
    const timer = setTimeout(() => {
      searchUsers({ variables: { search: newChatSearch.trim(), page: { first: 20 } } })
    }, 300)
    return () => clearTimeout(timer)
  }, [newChatSearch, searchUsers])

  // Focus search input when new chat opens
  useEffect(() => {
    if (showNewChat) {
      setTimeout(() => newChatInputRef.current?.focus(), 100)
    }
  }, [showNewChat])

  // PWA install prompt (Android/Chrome)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Platform detection — runs client-side only to match SSR output (prevents hydration crash)
  const [isChromeIOS, setIsChromeIOS] = useState(false)
  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua))
    setIsAndroid(/Android/.test(ua))
    setIsChromeIOS(/CriOS/.test(ua)) // Chrome on iOS uses CriOS user agent
  }, [])

  // Force correct PWA manifest — Safari reads manifest at HTML parse time ONLY.
  // If user arrived via SPA navigation (e.g. from /dex/feed), Safari cached the
  // main manifest and DOM changes won't make it re-read. Force a full page reload
  // so Safari gets fresh SSR HTML with /pulse-manifest.json.
  useEffect(() => {
    const hasWrongManifest = !!document.querySelector('link[rel="manifest"][href="/manifest.json"]')

    if (hasWrongManifest && !sessionStorage.getItem('pulse-manifest-reloaded')) {
      sessionStorage.setItem('pulse-manifest-reloaded', '1')
      window.location.replace('/dex/pulse')
      return
    }
    // Clear reload flag on unmount so it works again on next SPA visit
    return () => { sessionStorage.removeItem('pulse-manifest-reloaded') }
  }, [])

  // DOM cleanup as safety net — remove stale main manifest, ensure pulse manifest exists
  // Uses versioned URL (?v=2) to bust Safari's aggressive manifest cache
  useEffect(() => {
    const correctHref = '/pulse-manifest.json?v=2'
    document.querySelectorAll('link[rel="manifest"]').forEach(el => {
      if (!el.getAttribute('href')?.startsWith('/pulse-manifest.json')) el.remove()
    })
    if (!document.querySelector('link[rel="manifest"][href^="/pulse-manifest.json"]')) {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = correctHref
      document.head.appendChild(link)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome — trigger native install prompt directly
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') setDeferredPrompt(null)
      setShowInstallModal(false)
    } else if (isChromeIOS) {
      // Chrome on iOS can't add to home screen — copy link + direct to Safari
      try { await navigator.clipboard.writeText('https://soundchain.io/dex/pulse') } catch {}
      toast('Link copied! Open Safari and paste to install Pulse', { autoClose: 5000 })
      setShowInstallModal(true)
    } else {
      // Safari iOS or desktop — show instructions modal
      setShowInstallModal(true)
    }
  }

  // OpenClaw real-time gateway — register with profile ID (not user ID)
  // because call signals use profileId as toId (from chat system)
  const { connected, fallbackPolling, on, emit } = useOpenClawGateway(me?.profile?.id)

  // Memoize gateway object to prevent useWebRTCCall from re-running effects every render
  const gateway = useMemo(() => ({ emit, on, connected }), [emit, on, connected])

  // WebRTC Voice/Video Calling — myId must be profile ID to match
  // the toId used by startCall (selectedChat.profileId)
  const webrtc = useWebRTCCall({
    myId: me?.profile?.id,
    myName: me?.profile?.displayName || me?.profile?.userHandle || '',
    myAvatar: me?.profile?.profilePicture || undefined,
    gateway,
    onIncomingCall: useCallback((_callId: string, _callerId: string, callerName: string, mode: CallMode) => {
      toast.info(`Incoming ${mode} call from ${callerName}`, { autoClose: 10000 })
    }, []),
  })

  // Track previous chat state for new-message toast detection
  const prevChatsRef = useRef<Map<string, string>>(new Map()) // profileId → lastMessage createdAt

  // GraphQL data layer — poll every 5s for near-realtime DM awareness
  // Polling pauses while user is actively typing in chat (prevents text field bugs on iOS)
  const { data: chatsData, loading: chatsLoading, error: chatsError, refetch: refetchChats, startPolling, stopPolling } = useChatsQuery({
    pollInterval: 10000,  // 10s — was 5s, reduce Vercel invocations
    skip: meLoading || !me,  // Don't query until auth is ready
    fetchPolicy: 'cache-and-network',  // Always fetch fresh, don't rely on stale cache
    errorPolicy: 'all',  // Return partial data even if profile field resolver fails on some chats
    onError: (err) => console.error('[Pulse] Chats query error:', err.message),
  })
  // Stabilize startPolling/stopPolling via refs — Apollo does NOT guarantee referential stability
  // and using them as useCallback deps causes cascade re-renders (#310 on mobile Safari)
  const startPollingRef = useRef(startPolling)
  const stopPollingRef = useRef(stopPolling)
  startPollingRef.current = startPolling
  stopPollingRef.current = stopPolling

  const [loadHistory, { data: historyData, loading: historyLoading, refetch: refetchHistory }] =
    useChatHistoryLazyQuery({ fetchPolicy: 'network-only' })
  const refetchHistoryRef = useRef(refetchHistory)
  refetchHistoryRef.current = refetchHistory
  const [sendMessage, { loading: sending }] = useSendMessageMutation({
    onCompleted: () => {
      refetchHistory?.()
      refetchChats()
    },
  })
  const [resetUnread] = useResetUnreadMessageCountMutation()
  const [fetchUnread, { data: unreadData }] = useUnreadMessageCountLazyQuery({ fetchPolicy: 'no-cache' })
  const [sendTyping] = useMutation(SEND_TYPING, { onError: () => {} }) // Silent fail — backend may not have this yet

  // Stabilize fetchUnread via ref — Apollo lazy query functions are NOT referentially stable
  const fetchUnreadRef = useRef(fetchUnread)
  fetchUnreadRef.current = fetchUnread

  useEffect(() => {
    if (me) fetchUnreadRef.current()
  }, [me])

  // Redirect to login if not authenticated (wait for auth check to complete)
  useEffect(() => {
    if (!meLoading && !me && typeof window !== 'undefined') {
      router.replace('/login')
    }
  }, [me, meLoading, router])

  // Map chats to normalized items
  const chats: ChatItem[] = useMemo(() => {
    const nodes = chatsData?.chats?.nodes || []
    return nodes
      .filter((c) => c.profile) // Skip chats where partner profile was deleted
      .map((c) => ({
        id: c.id,
        profileId: c.profile?.id || c.id,
        displayName: c.profile?.displayName || 'Unknown',
        userHandle: c.profile?.userHandle || null,
        profilePicture: c.profile?.profilePicture || null,
        lastMessage: c.message || '',
        unread: c.unread,
        createdAt: c.createdAt,
        verified: c.profile?.verified,
        isOnline: (c.profile as any)?.isOnline || false,
      }))
  }, [chatsData])

  // Filter by search — match name and handle only (not message content, which gives confusing results)
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats
    const q = searchQuery.toLowerCase()
    return chats.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.userHandle && c.userHandle.toLowerCase().includes(q))
    )
  }, [chats, searchQuery])

  const messages = historyData?.chatHistory?.nodes || []

  // Poll chat history every 5s when viewing a conversation
  // SKIP refetch while user is actively typing — prevents iOS text field bugs
  // (keyboard dismiss, text vanishing, cursor jumps from re-render during input)
  // Uses refetchHistoryRef to avoid effect cascade from unstable Apollo refetch reference
  useEffect(() => {
    if (view !== 'chat' || !selectedChat) return
    let interval: NodeJS.Timeout | undefined
    const poll = () => {
      interval = setInterval(() => {
        if (!isUserTypingRef.current && !document.hidden) {
          refetchHistoryRef.current?.()
        }
      }, 5000)
    }
    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval)
      } else {
        poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    poll()
    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [view, selectedChat])

  // Detect incoming peer messages — flash typing indicator before message appears
  useEffect(() => {
    if (!selectedChat || !me) return
    const peerMsgs = messages.filter((m: any) => m.fromId !== me.profile?.id && m.fromId !== me.id)
    if (peerMsgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      // New message arrived from peer — they were typing
      setPeerTyping(false)
    }
    prevMsgCountRef.current = peerMsgs.length
  }, [messages, selectedChat, me])

  // Reset typing when switching chats
  useEffect(() => {
    setPeerTyping(false)
    prevMsgCountRef.current = 0
  }, [selectedChat?.profileId])

  // Send typing signal when user types (debounced — max once per 3s)
  // Also pauses ALL polling (chats list + chat history) while typing
  // Prevents iOS text field bugs: keyboard dismiss, text vanishing, cursor jumps
  // Uses refs for startPolling/stopPolling to avoid re-render cascade (#310)
  const handleTypingSignal = useCallback(() => {
    // Pause all polling while typing
    if (!isUserTypingRef.current) {
      isUserTypingRef.current = true
      stopPollingRef.current()
    }
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current)
    typingIdleTimerRef.current = setTimeout(() => {
      isUserTypingRef.current = false
      startPollingRef.current(5000) // Resume chats polling 3s after last keystroke
    }, 3000)

    if (!selectedChat) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 3000) return
    lastTypingSentRef.current = now
    sendTyping({ variables: { toId: selectedChat.profileId } }).catch(() => {})
  }, [selectedChat, sendTyping])

  // Scroll to bottom ONLY when message count actually changes (not on every poll re-render)
  // This prevents iOS keyboard dismiss + text loss from scrollIntoView stealing focus
  const msgCountRef = useRef(0)
  useEffect(() => {
    const newCount = messages.length
    if (newCount !== msgCountRef.current) {
      msgCountRef.current = newCount
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const openChat = useCallback(
    (chat: ChatItem) => {
      warmUpAudio() // Unlock AudioContext on first user tap (iOS)
      setSelectedChat(chat)
      setView('chat')
      loadHistory({ variables: { profileId: chat.profileId } })
      resetUnread()
    },
    [loadHistory, resetUnread]
  )

  // Detect new incoming messages from polling → show toast
  useEffect(() => {
    if (!chats.length) return
    const prev = prevChatsRef.current

    // On first load, seed the map without toasting
    if (prev.size === 0) {
      chats.forEach((c) => prev.set(c.profileId, c.createdAt))
      return
    }

    for (const chat of chats) {
      const lastSeen = prev.get(chat.profileId)
      const isNew = !lastSeen || new Date(chat.createdAt).getTime() > new Date(lastSeen).getTime()

      // Only toast if: new message, it's unread, and we're NOT currently viewing that chat
      if (isNew && chat.unread && selectedChat?.profileId !== chat.profileId) {
        const preview = /!\[!?emote:/.test(chat.lastMessage)
          ? chat.lastMessage.replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '😎')
          : chat.lastMessage
        // Vibrate + chime on new message
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        playNotificationChime()
        toast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: WA.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SoundChain Pulse</span>
              <span style={{ fontSize: '10px', color: WA.text_secondary }}>now</span>
            </div>
            <div style={{ fontSize: '13px', color: WA.text }}>
              <span style={{ fontWeight: 600 }}>{chat.displayName}</span>
              <span style={{ color: WA.text_secondary }}>{' '}{preview.slice(0, 70)}{preview.length > 70 ? '...' : ''}</span>
            </div>
          </div>,
          {
            autoClose: 8000,
            onClick: () => openChat(chat),
            style: { cursor: 'pointer', backgroundColor: WA.header, borderLeft: `3px solid ${WA.accent}`, padding: '10px 14px' },
          }
        )
      }

      prev.set(chat.profileId, chat.createdAt)
    }
  }, [chats, selectedChat?.profileId, openChat])

  const closePickers = useCallback(() => {
    setShowEmoji(false)
    setShowStickers(false)
    setShowGifs(false)
  }, [])

  // Stable picker toggle handlers — avoids creating new arrow functions every render
  const toggleEmoji = useCallback(() => { closePickers(); setShowEmoji(v => !v) }, [closePickers])
  const toggleStickers = useCallback(() => { closePickers(); setShowStickers(v => !v) }, [closePickers])
  const toggleGifs = useCallback(() => { closePickers(); setShowGifs(v => !v) }, [closePickers])

  const goBack = useCallback(() => {
    setView('list')
    setSelectedChat(null)
    closePickers()
    // Resume polling if it was paused during typing
    isUserTypingRef.current = false
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current)
    startPollingRef.current(5000)
  }, [closePickers])

  const handleSend = async () => {
    warmUpAudio()
    const text = messageText.trim()
    if (!text || !selectedChat) return
    // Clear text IMMEDIATELY — don't wait for mutation to complete
    setMessageText('')
    closePickers()
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    try {
      await sendMessage({
        variables: {
          input: {
            message: text,
            toId: selectedChat.profileId, // CRITICAL: profile ID, not chat ID
          },
        },
        refetchQueries: [ChatsDocument],
      })
    } catch {
      // Restore text on failure so user doesn't lose their message
      setMessageText(text)
      toast.error('Message failed to send', { autoClose: 3000 })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji: { native?: string }) => {
    if (emoji.native) setMessageText((t) => t + emoji.native)
    inputRef.current?.focus()
  }

  const handleStickerSelect = (url: string) => {
    // Send sticker as message with img markdown
    sendMessage({
      variables: {
        input: {
          message: url,
          toId: selectedChat!.profileId,
        },
      },
      refetchQueries: [ChatsDocument],
    })
    closePickers()
  }

  const handleGifSelect = (url: string) => {
    sendMessage({
      variables: {
        input: {
          message: url,
          toId: selectedChat!.profileId,
        },
      },
      refetchQueries: [ChatsDocument],
    })
    closePickers()
  }

  const handleCopyMessage = async (msgId: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedMsgId(msgId)
    setTimeout(() => setCopiedMsgId(null), 1500)
  }

  const handleReplyToMessage = (text: string) => {
    setMessageText(`> ${text.slice(0, 80)}${text.length > 80 ? '...' : ''}\n\n`)
    setActiveMessageId(null)
    inputRef.current?.focus()
  }

  const handleShareMessage = async (text: string) => {
    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopiedMsgId('share')
      setTimeout(() => setCopiedMsgId(null), 1500)
    }
    setActiveMessageId(null)
  }

  const handleReactToMessage = (emoji: string) => {
    if (!selectedChat) return
    sendMessage({
      variables: {
        input: { message: emoji, toId: selectedChat.profileId },
      },
      refetchQueries: [ChatsDocument],
    })
    setActiveMessageId(null)
  }

  const unreadCount = unreadData?.myProfile?.unreadMessageCount || 0

  // Stable refs for webrtc methods — MUST be before any early returns (React #310)
  const answerCallRef = useRef(webrtc.answerCall)
  const declineCallRef = useRef(webrtc.declineCall)
  answerCallRef.current = webrtc.answerCall
  declineCallRef.current = webrtc.declineCall

  const handleAnswerCall = useCallback(() => {
    const offer = (window as any).__pendingCallOffer
    if (offer) {
      answerCallRef.current(offer.callId, offer.senderId, offer.senderName, offer.senderAvatar, offer.mode, offer.offerSdp)
      delete (window as any).__pendingCallOffer
    }
  }, [])

  const handleDeclineCall = useCallback(() => {
    const offer = (window as any).__pendingCallOffer
    if (offer) {
      declineCallRef.current(offer.callId, offer.senderId)
      delete (window as any).__pendingCallOffer
    }
  }, [])

  if (meLoading || !me) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: WA.bg }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${WA.accent} transparent ${WA.accent} ${WA.accent}` }} />
      </div>
    )
  }

  // ─── Install Pulse modal ─────────────────────────────────────
  const renderInstallModal = () => {
    if (!showInstallModal) return null
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: WA.header, border: `1px solid ${WA.border}` }}>
          {/* Header with close */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-medium" style={{ color: WA.text_secondary }}>Install Pulse</span>
            <button onClick={() => setShowInstallModal(false)} className="p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" style={{ color: WA.text_secondary }} />
            </button>
          </div>

          {/* Pulsing logo */}
          <div className="flex flex-col items-center py-6">
            <div className="relative mb-4">
              {/* Outer pulse ring */}
              <div className="absolute inset-0 -m-3 rounded-full animate-ping" style={{ backgroundColor: `${WA.accent}15`, animationDuration: '2s' }} />
              <div className="absolute inset-0 -m-1.5 rounded-full animate-pulse" style={{ backgroundColor: `${WA.accent}20` }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: WA.bg, border: `2px solid ${WA.accent}40` }}>
                <MiniSphere size={40} />
              </div>
            </div>
            <h3 className="text-lg font-bold" style={{ color: WA.text }}>SoundChain Pulse</h3>
            <p className="text-xs mt-1 text-center px-6" style={{ color: WA.text_secondary }}>
              Add Pulse to your home screen for instant access — just like a native app, no app store needed.
            </p>
          </div>

          {/* Platform-specific instructions */}
          <div className="px-4 pb-4">
            {isIOS ? (
              <div className="space-y-3">
                {/* Important: must be in Safari */}
                <div className="p-2.5 rounded-xl text-center" style={{ backgroundColor: `${WA.accent}10`, border: `1px solid ${WA.accent}30` }}>
                  <p className="text-xs font-medium" style={{ color: WA.accent }}>
                    Must be in Safari — not Chrome or other browsers
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>1</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Tap the Share button</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>
                      The <ShareIcon className="w-3 h-3 inline -mt-0.5" style={{ color: WA.accent }} /> icon at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>2</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Scroll down, tap &ldquo;Add to Home Screen&rdquo;</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>
                      Look for the + icon in the share sheet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>3</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Tap &ldquo;Add&rdquo;</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>
                      Pulse will appear on your home screen with the SoundChain icon
                    </p>
                  </div>
                </div>
                {/* Copy direct link for users not in Safari */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://soundchain.io/dex/pulse')
                    toast.success('Link copied — paste in Safari to install')
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl transition-colors hover:bg-white/5"
                  style={{ backgroundColor: WA.bg, border: `1px solid ${WA.border}` }}
                >
                  <Copy className="w-3.5 h-3.5" style={{ color: WA.text_secondary }} />
                  <span className="text-xs" style={{ color: WA.text_secondary }}>Not in Safari? Copy link to open there</span>
                </button>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>1</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Tap the menu (three dots)</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>Top-right corner of Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>2</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Tap &ldquo;Add to Home screen&rdquo;</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>Or tap &ldquo;Install app&rdquo; if shown</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: WA.bg }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: `${WA.accent}20`, color: WA.accent }}>1</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: WA.text }}>Click the install icon in your address bar</p>
                    <p className="text-xs mt-0.5" style={{ color: WA.text_secondary }}>
                      Or use the browser menu &rarr; &ldquo;Install SoundChain Pulse&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowInstallModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: WA.text_secondary, border: `1px solid ${WA.border}` }}
              >
                Maybe Later
              </button>
              {deferredPrompt ? (
                <button
                  onClick={async () => {
                    deferredPrompt.prompt()
                    const result = await deferredPrompt.userChoice
                    if (result.outcome === 'accepted') setDeferredPrompt(null)
                    setShowInstallModal(false)
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-colors"
                  style={{ backgroundColor: WA.accent }}
                >
                  Install Now
                </button>
              ) : (
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-colors"
                  style={{ backgroundColor: WA.accent }}
                >
                  Got It
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── New Chat overlay ────────────────────────────────────────
  const searchResults = searchData?.exploreUsers?.nodes || []

  const handleSelectUser = (user: { id: string; displayName?: string | null; userHandle?: string | null; profilePicture?: string | null; verified?: boolean | null }) => {
    const chatItem: ChatItem = {
      id: `new-${user.id}`,
      profileId: user.id,
      displayName: user.displayName || 'Unknown',
      userHandle: user.userHandle || null,
      profilePicture: user.profilePicture || null,
      lastMessage: '',
      unread: false,
      createdAt: new Date().toISOString(),
      verified: user.verified,
    }
    setShowNewChat(false)
    setNewChatSearch('')
    openChat(chatItem)
  }

  const renderNewChatOverlay = () => {
    if (!showNewChat) return null
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: WA.bg }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: WA.header, paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
          <button onClick={() => { setShowNewChat(false); setNewChatSearch('') }} className="p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: WA.text_secondary }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: WA.text }}>New Chat</h2>
        </div>

        {/* Search input */}
        <div className="px-3 py-2" style={{ backgroundColor: WA.bg }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: WA.search_bg }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: WA.text_secondary }} />
            <input
              ref={newChatInputRef}
              type="text"
              placeholder="Search by name or username"
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: WA.text, fontSize: '16px' }}
            />
            {newChatSearch && (
              <button onClick={() => setNewChatSearch('')}>
                <X className="w-4 h-4" style={{ color: WA.text_secondary }} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: WA.header }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ backgroundColor: WA.header }} />
                    <div className="h-2.5 rounded w-1/4" style={{ backgroundColor: WA.header }} />
                  </div>
                </div>
              ))}
            </div>
          ) : !newChatSearch.trim() ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <Search className="w-10 h-10 mb-3" style={{ color: `${WA.text_secondary}40` }} />
              <p className="text-sm" style={{ color: WA.text_secondary }}>
                Search for a user to start a conversation
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <p className="text-sm" style={{ color: WA.text_secondary }}>
                No users found for &ldquo;{newChatSearch}&rdquo;
              </p>
            </div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1f2c34]/50 transition-colors text-left"
              >
                <Avatar
                  profile={{ profilePicture: user.profilePicture, userHandle: user.userHandle }}
                  linkToProfile={false}
                  pixels={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate" style={{ color: WA.text }}>
                      {user.displayName || 'Unknown'}
                    </span>
                    {user.verified && (
                      <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: WA.accent }} />
                    )}
                  </div>
                  {user.userHandle && (
                    <p className="text-xs truncate" style={{ color: WA.text_secondary }}>
                      @{user.userHandle}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // ─── Push notification banner ──────────────────────────────────
  const pushIsDenied = pushPermission === 'denied'
  // Show banner unless user explicitly dismissed OR is TRULY subscribed (both server + client)
  // The hook now checks both server record AND client-side PushManager subscription,
  // so after clearing Safari cache, stale server records won't hide the banner.
  const showPushBanner = !pushDismissed && !pushSubscribed

  const handleEnablePush = async () => {
    setPushError(null)
    setPushLoading(true)

    try {
      // Let the hook handle EVERYTHING — permission request + PushManager subscribe + server registration.
      // IMPORTANT: Do NOT call Notification.requestPermission() here too — on iOS PWA,
      // calling it twice causes the second call to return 'denied' even after the user taps Allow.
      const result = await pushSubscribe()
      if (result.success) {
        setPushError(null)
        setPushJustEnabled(true)
        // Auto-dismiss the success banner after 30 seconds if user doesn't interact
        setTimeout(() => setPushJustEnabled(false), 30000)
      } else {
        // Map the error to a user-friendly message
        const err = result.error || ''
        if (err.includes('permission denied') || err.includes('Permission denied')) {
          if (isStandalone && isIOS) {
            setPushError('Permission denied. Remove this app from Home Screen, re-add it from Safari, and tap Allow when prompted.')
          } else if (isIOS) {
            setPushError('Permission denied. Add Pulse to your Home Screen first, then enable notifications from there.')
          } else {
            setPushError('Notifications blocked. Check your browser settings to allow notifications for this site.')
          }
        } else if (err.includes('not supported')) {
          setPushError('Notifications not available on this device/browser.')
        } else {
          setPushError(err || 'Subscription failed — tap Enable to try again.')
        }
      }
    } catch (err: any) {
      console.error('[Pulse] Push error:', err)
      setPushError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setPushLoading(false)
    }
  }

  const renderPushBanner = () => {
    if (!showPushBanner) return null

    // When permission is already denied on iOS PWA — show reinstall instructions
    if (pushIsDenied && isStandalone && isIOS) {
      return (
        <div className="mx-3 mt-2 mb-1 rounded-xl px-4 py-3" style={{ backgroundColor: WA.header, border: `1px solid ${WA.border}` }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: '#f59e0b20' }}>
              <BellRing className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: WA.text }}>Notification permission denied</p>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: WA.text_secondary }}>
                To fix: remove this app from Home Screen, open Safari → soundchain.io/dex/pulse → Add to Home Screen again → tap Allow when prompted.
              </p>
            </div>
            <button
              onClick={() => setPushDismissed(true)}
              className="p-1.5 rounded-full hover:bg-white/5 flex-shrink-0"
              style={{ color: WA.text_secondary }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="mx-3 mt-2 mb-1 rounded-xl px-4 py-3" style={{ backgroundColor: WA.header, border: `1px solid ${WA.border}` }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full" style={{ backgroundColor: `${WA.accent}20` }}>
            <BellRing className="w-5 h-5" style={{ color: WA.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: WA.text }}>Enable notifications</p>
            <p className="text-[11px] mt-0.5" style={{ color: WA.text_secondary }}>
              Get notified when you receive new messages
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPushDismissed(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: WA.text_secondary }}
            >
              Later
            </button>
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-black transition-colors disabled:opacity-60"
              style={{ backgroundColor: WA.accent }}
            >
              {pushLoading ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
        {pushError && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <p className="text-[11px] flex-1" style={{ color: '#f59e0b' }}>
              {pushError}
            </p>
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
              style={{ color: WA.accent, backgroundColor: `${WA.accent}15` }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderPushSuccess = () => {
    // Show success banner after enabling, OR if already subscribed and user wants settings
    if (!pushJustEnabled && !showPushSettings) return null

    return (
      <div className="mx-3 mt-2 mb-1 space-y-2">
        {/* Success banner */}
        {pushJustEnabled && (
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#00a88420', border: '1px solid #00a88440' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ backgroundColor: '#00a88430' }}>
                <Check className="w-5 h-5" style={{ color: WA.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: WA.accent }}>Notifications enabled!</p>
                <p className="text-[11px] mt-0.5" style={{ color: WA.text_secondary }}>
                  You&apos;ll get alerts for new messages, likes, and more
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPushSettings(!showPushSettings)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                  style={{ color: WA.accent, backgroundColor: `${WA.accent}15` }}
                >
                  Customize
                </button>
                <button
                  onClick={() => { setPushJustEnabled(false); setShowPushSettings(false) }}
                  className="p-1 rounded-full hover:bg-white/5"
                  style={{ color: WA.text_secondary }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification settings panel */}
        {showPushSettings && (
          <div className="rounded-xl px-4 py-3 space-y-3" style={{ backgroundColor: WA.header, border: `1px solid ${WA.border}` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: WA.text }}>Notification Preferences</p>
              <button
                onClick={() => setShowPushSettings(false)}
                className="p-1 rounded-full hover:bg-white/5"
                style={{ color: WA.text_secondary }}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: WA.text_secondary }}>
              Choose which notifications you receive. You can also customize sounds, badges, and banner style in{' '}
              <strong style={{ color: WA.text }}>iOS Settings → SoundChain Pulse → Notifications</strong>.
            </p>

            {/* Quick toggles — these are informational for now, full control in account settings */}
            <div className="space-y-2">
              {[
                { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Direct Messages', color: WA.accent, defaultOn: true },
                { icon: <Heart className="w-3.5 h-3.5" />, label: 'Likes & Reactions', color: '#f43f5e', defaultOn: true },
                { icon: <Users className="w-3.5 h-3.5" />, label: 'New Followers', color: '#3b82f6', defaultOn: true },
                { icon: <Bell className="w-3.5 h-3.5" />, label: 'Comments & Replies', color: '#22c55e', defaultOn: true },
                { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Tips & Earnings', color: '#eab308', defaultOn: true },
                { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'Sales & Marketplace', color: '#a855f7', defaultOn: true },
              ].map(({ icon, label, color }) => (
                <div key={label} className="flex items-center gap-2.5 py-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    {icon}
                  </div>
                  <span className="text-[11px] flex-1" style={{ color: WA.text }}>{label}</span>
                  <div className="w-8 h-[18px] rounded-full relative" style={{ backgroundColor: WA.accent }}>
                    <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 border-t space-y-2" style={{ borderColor: WA.border }}>
              <button
                onClick={async () => {
                  setTestPushResult(null)
                  try {
                    const { data } = await testPush()
                    setTestPushResult(data?.testPushNotification ? 'sent' : 'failed')
                  } catch {
                    setTestPushResult('error')
                  }
                  setTimeout(() => setTestPushResult(null), 5000)
                }}
                disabled={testPushLoading}
                className="flex items-center gap-2 py-1.5 text-[11px] font-medium transition-colors hover:opacity-80 w-full"
                style={{ color: '#eab308' }}
              >
                <BellRing className="w-3.5 h-3.5" />
                {testPushLoading ? 'Sending...' : 'Send Test Notification'}
              </button>
              {testPushResult && (
                <p className="text-[10px] px-1" style={{ color: testPushResult === 'sent' ? '#22c55e' : '#f43f5e' }}>
                  {testPushResult === 'sent' ? 'Test notification sent! Check your lock screen.' : 'Failed to send — check VAPID config on Lambda.'}
                </p>
              )}
              <p className="text-[10px] leading-relaxed" style={{ color: WA.text_secondary }}>
                For sounds, badges, and banner style: <strong style={{ color: WA.text }}>iOS Settings → SoundChain Pulse → Notifications</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render helpers ───────────────────────────────────────────
  const renderConversationList = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: WA.bg }}>
      {/* Header — safe area padding for iOS standalone PWA */}
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: WA.header, paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
        <div className="flex items-center gap-2">
          {/* SoundChain logo — back to DEX */}
          <Link href="/dex/feed" className="flex items-center p-1 rounded-lg hover:bg-white/10 transition-colors">
            <MiniSphere size={28} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: WA.text }}>
            Pulse
          </h1>
          {/* Logged-in user avatar — critical for PWA standalone where there's no browser chrome */}
          {me?.profile && (
            <Link href={`/dex/users/${me.handle || me.profile.id}`} className="ml-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors" style={{ backgroundColor: `${WA.accent}15` }}>
              {me.profile.profilePicture ? (
                <img
                  src={me.profile.profilePicture}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                  style={{ border: `1.5px solid ${WA.accent}` }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: WA.accent, color: WA.bg }}>
                  {(me.profile.displayName || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="text-[11px] font-medium max-w-[80px] truncate" style={{ color: WA.accent }}>
                {me.handle || me.profile.displayName}
              </span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Connection indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: WA.bg }}>
            {connected ? (
              <Wifi className="w-3 h-3" style={{ color: WA.accent }} />
            ) : (
              <WifiOff className="w-3 h-3" style={{ color: WA.text_secondary }} />
            )}
            <span className="text-[10px]" style={{ color: connected ? WA.accent : WA.text_secondary }}>
              {connected ? 'Live' : 'Polling'}
            </span>
          </div>
          {/* Install Pulse to Home Screen — prominent pill so users don't need to find Safari share button */}
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{ backgroundColor: `${WA.accent}20`, border: `1px solid ${WA.accent}40` }}
              title="Add to Home Screen"
            >
              <Download className="w-3.5 h-3.5" style={{ color: WA.accent }} />
              <span className="text-xs font-semibold" style={{ color: WA.accent }}>Install</span>
            </button>
          )}
          {/* Push notification settings — persistent access when subscribed */}
          {pushSupported && (
            <button
              onClick={() => {
                if (pushSubscribed) {
                  setShowPushSettings((prev) => !prev)
                } else {
                  handleEnablePush()
                }
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
              title={pushSubscribed ? 'Notification settings' : 'Enable notifications'}
            >
              <Bell className="w-4.5 h-4.5" style={{ color: pushSubscribed ? WA.accent : WA.text_secondary }} />
              {pushSubscribed && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              )}
            </button>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5" style={{ color: WA.text_secondary }} />
          </button>
          <button onClick={() => setShowNewChat(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Edit className="w-5 h-5" style={{ color: WA.text_secondary }} />
          </button>
        </div>
      </div>

      {/* DEX nav strip — browser only, hidden in standalone PWA */}
      {!isStandalone && (
        <div className="flex items-center gap-3 px-3 py-1.5 overflow-x-auto scrollbar-hide border-b" style={{ backgroundColor: WA.bgDarker, borderColor: WA.border }}>
          <Link href="/dex/feed" className="text-[11px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: WA.accent }}>
            Feed
          </Link>
          <Link href="/dex/explore" className="text-[11px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: WA.text_secondary }}>
            Explore
          </Link>
          <Link href="/dex/wallet" className="text-[11px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: WA.text_secondary }}>
            Wallet
          </Link>
          <Link href="/dex/explore" className="text-[11px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: WA.text_secondary }}>
            Explore
          </Link>
          <Link href="/dex/me" className="text-[11px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity" style={{ color: WA.text_secondary }}>
            Profile
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: WA.border }}>
        <button
          onClick={() => setTab('chats')}
          className="flex-1 py-3 text-sm font-semibold transition-colors relative"
          style={{ color: tab === 'chats' ? WA.accent : WA.text_secondary }}
        >
          Chats
          {unreadCount > 0 && (
            <span
              className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1"
              style={{ backgroundColor: WA.accent, color: WA.bgDarker }}
            >
              {unreadCount}
            </span>
          )}
          {tab === 'chats' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: WA.accent }} />
          )}
        </button>
        <button
          onClick={() => setTab('notifications')}
          className="flex-1 py-3 text-sm font-semibold transition-colors relative"
          style={{ color: tab === 'notifications' ? WA.accent : WA.text_secondary }}
        >
          <Bell className="w-4 h-4 inline-block mr-1 -mt-0.5" />
          Notifications
          {tab === 'notifications' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: WA.accent }} />
          )}
        </button>
      </div>

      {/* Search bar — always visible for quick user/chat search */}
      {tab === 'chats' && (
        <div className="px-3 py-2" style={{ backgroundColor: WA.bg }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: WA.search_bg }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: WA.text_secondary }} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ color: WA.text, fontSize: '16px' }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4" style={{ color: WA.text_secondary }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Push notification prompt / success / settings */}
      {tab === 'chats' && renderPushBanner()}
      {tab === 'chats' && renderPushSuccess()}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'chats' ? (
          chatsLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: WA.header }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ backgroundColor: WA.header }} />
                    <div className="h-2.5 rounded w-2/3" style={{ backgroundColor: WA.header }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <MessageCircle className="w-12 h-12 mb-3" style={{ color: `${WA.text_secondary}40` }} />
              <p className="text-sm" style={{ color: WA.text_secondary }}>
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => openChat(chat)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1f2c34]/50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <Avatar
                    profile={{ profilePicture: chat.profilePicture, userHandle: chat.userHandle, isOnline: chat.isOnline } as any}
                    linkToProfile={false}
                    pixels={48}
                    showOnlineIndicator
                  />
                </div>
                <div className="flex-1 min-w-0 border-b" style={{ borderColor: `${WA.border}60` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate" style={{ color: WA.text }}>
                      {chat.displayName}
                    </span>
                    <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: chat.unread ? WA.accent : WA.text_secondary }}>
                      {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 pb-3">
                    <p className="text-sm truncate pr-2" style={{ color: WA.text_secondary }}>
                      {/!\[!?emote:/.test(chat.lastMessage)
                        ? chat.lastMessage.replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '😎')
                        : chat.lastMessage}
                    </p>
                    {chat.unread && (
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: WA.accent, color: WA.bgDarker }}
                      >
                        1
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )
        ) : (
          <PulseNotificationFeed />
        )}
      </div>
    </div>
  )

  const renderChatThread = () => {
    if (!selectedChat) return null

    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: WA.bg }}>
        {/* Chat header — safe area padding for iOS standalone PWA */}
        <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0" style={{ backgroundColor: WA.header, paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
          <button onClick={goBack} className="p-1 lg:hidden">
            <ArrowLeft className="w-5 h-5" style={{ color: WA.text_secondary }} />
          </button>
          <Avatar
            profile={{ profilePicture: selectedChat.profilePicture, userHandle: selectedChat.userHandle, isOnline: selectedChat.isOnline } as any}
            linkToProfile={false}
            pixels={40}
            showOnlineIndicator
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: WA.text }}>
              {selectedChat.displayName}
            </p>
            <p className="text-xs truncate" style={{ color: WA.text_secondary }}>
              {selectedChat.isOnline ? (
                <span style={{ color: WA.accent }}>online</span>
              ) : selectedChat.userHandle ? (
                <>@{selectedChat.userHandle}</>
              ) : null}
            </p>
          </div>
          {/* Voice/Video call buttons */}
          <CallButton
            onVoiceCall={() => {
              if (!connected) {
                toast.error('Relay offline — calls need live connection. Check your WiFi.', { autoClose: 5000 })
                return
              }
              toast.info(`Calling ${selectedChat.displayName}...`, { autoClose: 3000 })
              webrtc.startCall(selectedChat.profileId, selectedChat.displayName, selectedChat.profilePicture || undefined, 'voice')
            }}
            onVideoCall={() => {
              if (!connected) {
                toast.error('Relay offline — calls need live connection. Check your WiFi.', { autoClose: 5000 })
                return
              }
              toast.info(`Video calling ${selectedChat.displayName}...`, { autoClose: 3000 })
              webrtc.startCall(selectedChat.profileId, selectedChat.displayName, selectedChat.profilePicture || undefined, 'video')
            }}
          />
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${WA.accent} transparent ${WA.accent} ${WA.accent}` }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="px-4 py-2 rounded-lg text-center" style={{ backgroundColor: WA.header }}>
                <p className="text-xs" style={{ color: WA.text_secondary }}>
                  No messages yet. Say hello!
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.fromId === me?.profile?.id || msg.fromId === me?.id
              const hasEmotes = /!\[!?emote:/.test(msg.message)
              const isMedia = !hasEmotes && (/\.(gif|png|jpg|jpeg|webp)(\?|$)/i.test(msg.message) || msg.message.startsWith('https://media'))
              const isActive = activeMessageId === msg.id
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    onClick={() => setActiveMessageId(isActive ? null : msg.id)}
                    className={`max-w-[75%] rounded-lg px-3 py-1.5 cursor-pointer transition-all ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${isActive ? 'ring-1' : ''}`}
                    style={{
                      backgroundColor: isMine ? WA.bubble_sent : WA.bubble_recv,
                      ...(isActive ? { ringColor: WA.accent } : {}),
                    }}
                  >
                    {isMedia ? (
                      <img src={msg.message} alt="" className="max-w-full rounded-md max-h-64" loading="lazy" />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words" style={{ color: WA.text }}>
                        <EmoteRenderer text={msg.message} linkify />
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px]" style={{ color: `${WA.text_secondary}99` }}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                      </span>
                      {isMine && (
                        <CheckCheck className="w-3.5 h-3.5" style={{ color: WA.accent }} />
                      )}
                    </div>
                  </div>

                  {/* Action pills — shown on tap */}
                  {isActive && (
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Quick emoji reactions */}
                      {['❤️', '🔥', '😂', '🚀'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReactToMessage(emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-base"
                          style={{ backgroundColor: `${WA.header}cc` }}
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Reply */}
                      <button
                        onClick={() => handleReplyToMessage(msg.message)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                        style={{ backgroundColor: `${WA.header}cc` }}
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" style={{ color: WA.text_secondary }} />
                      </button>
                      {/* Copy */}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.message)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                        style={{ backgroundColor: `${WA.header}cc` }}
                        title="Copy"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3.5 h-3.5" style={{ color: WA.accent }} />
                        ) : (
                          <Copy className="w-3.5 h-3.5" style={{ color: WA.text_secondary }} />
                        )}
                      </button>
                      {/* Share */}
                      <button
                        onClick={() => handleShareMessage(msg.message)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                        style={{ backgroundColor: `${WA.header}cc` }}
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" style={{ color: WA.text_secondary }} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
          {peerTyping && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* Picker area */}
        {(showEmoji || showStickers || showGifs) && (
          <div className="border-t flex-shrink-0" style={{ borderColor: WA.border, backgroundColor: WA.header, maxHeight: 280 }}>
            <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
              {showEmoji && (
                <EmojiPicker
                  theme="dark"
                  onEmojiSelect={handleEmojiSelect}
                  set="native"
                  previewPosition="none"
                  skinTonePosition="none"
                />
              )}
              {showStickers && <StickerPicker onSelect={handleStickerSelect} />}
              {showGifs && <GifPicker onSelect={handleGifSelect} />}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2 px-3 py-2 flex-shrink-0" style={{ backgroundColor: WA.bg }}>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleEmoji}
              className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <Smile className="w-5 h-5" style={{ color: showEmoji ? WA.accent : WA.text_secondary }} />
            </button>
            <button
              onClick={toggleStickers}
              className={`p-2 rounded-full transition-colors ${showStickers ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <Sticker className="w-5 h-5" style={{ color: showStickers ? WA.accent : WA.text_secondary }} />
            </button>
            <button
              onClick={toggleGifs}
              className={`p-2 rounded-full transition-colors ${showGifs ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <ImageIcon className="w-5 h-5" style={{ color: showGifs ? WA.accent : WA.text_secondary }} />
            </button>
          </div>
          <div className="flex-1 flex items-end rounded-2xl px-3 py-2" style={{ backgroundColor: WA.input }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value)
                handleTypingSignal()
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              className="flex-1 bg-transparent outline-none resize-none max-h-[120px] leading-5"
              style={{ color: WA.text, fontSize: '16px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            className="p-2.5 rounded-full transition-colors disabled:opacity-40"
            style={{ backgroundColor: WA.accent }}
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {renderNewChatOverlay()}
      {renderInstallModal()}
      {/* WebRTC Call Overlay */}
      <CallUI
        callState={webrtc.callState}
        callMode={webrtc.callMode}
        remotePeer={webrtc.remotePeer}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        isMuted={webrtc.isMuted}
        isCameraOff={webrtc.isCameraOff}
        formattedDuration={webrtc.formattedDuration}
        isTownHall={webrtc.isTownHall}
        townHallName={webrtc.townHallName}
        townHallPeers={webrtc.townHallPeers}
        onEndCall={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleCamera={webrtc.toggleCamera}
        onAnswerCall={handleAnswerCall}
        onDeclineCall={handleDeclineCall}
        onLeaveTownHall={webrtc.leaveTownHall}
      />
      <Head>
        <title>SoundChain Pulse</title>
        <link key="pulse-manifest" rel="manifest" href="/pulse-manifest.json?v=4" />
        <link key="pulse-icon" rel="apple-touch-icon" sizes="180x180" href="/favicons/pulse-apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="SoundChain Pulse" />
        <meta name="application-name" content="SC Pulse" />
        <meta name="theme-color" content={WA.accent} />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </Head>

      <div className="flex" style={{ backgroundColor: WA.bg, height: '100dvh', touchAction: 'manipulation' }}>
        {/* Desktop: side-by-side layout */}
        <div className="hidden lg:flex w-full" style={{ height: '100dvh' }}>
          {/* Left panel — conversations */}
          <div className="w-[380px] flex-shrink-0 border-r flex flex-col" style={{ borderColor: WA.border }}>
            {renderConversationList()}
          </div>
          {/* Right panel — chat thread or empty state */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              renderChatThread()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: WA.bgDarker }}>
                <div className="mb-4">
                  <MiniSphere size={64} />
                </div>
                <h2 className="text-xl font-light mb-2" style={{ color: WA.text }}>
                  SoundChain Pulse
                </h2>
                <p className="text-sm max-w-xs text-center" style={{ color: WA.text_secondary }}>
                  Send and receive messages with end-to-end encryption powered by Nostr NIP-17.
                </p>
                <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full" style={{ backgroundColor: WA.header }}>
                  {connected ? (
                    <Wifi className="w-4 h-4" style={{ color: WA.accent }} />
                  ) : (
                    <WifiOff className="w-4 h-4" style={{ color: WA.text_secondary }} />
                  )}
                  <span className="text-xs" style={{ color: connected ? WA.accent : WA.text_secondary }}>
                    {connected ? 'OpenClaw Gateway Connected' : 'GraphQL Polling (Gateway Offline)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: single column — view toggle */}
        <div className="lg:hidden w-full flex flex-col" style={{ height: '100dvh' }}>
          {view === 'list' ? renderConversationList() : renderChatThread()}
        </div>
      </div>
    </>
  )
}

// Bypass global Layout (which renders legacy L1 NavBar).
// Same pattern as DEX mega-router getLayout — provides only what Pulse needs.
;(PulsePage as any).getLayout = (page: ReactElement) => {
  return (
    <>
      {page}
      <ToastContainer
        position="top-center"
        autoClose={6 * 1000}
        toastStyle={{
          backgroundColor: '#202020',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center',
        }}
      />
    </>
  )
}

export default PulsePage
