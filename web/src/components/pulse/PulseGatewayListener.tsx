/**
 * PulseGatewayListener — Global notification listener.
 *
 * Mounted in Layout.tsx so notifications work across ALL pages,
 * not just when on /dex/pulse.
 *
 * Strategy:
 *   1. Try OpenClaw WebSocket gateway (real-time)
 *   2. Fallback: Poll chats every 8s for new unread messages → toast
 *
 * Desktop: Rich slide-in toast from the RIGHT (pulse-desktop container).
 * Mobile:  Standard top-center toast (default container).
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useMe } from 'hooks/useMe'
import { useOpenClawGateway } from 'hooks/useOpenClawGateway'
import { useChatsQuery } from 'lib/graphql'
import { toast } from 'react-toastify'
import { playNotificationChime, warmUpAudio } from 'utils/notificationChime'

const ACCENT = '#00a884'
const TEXT = '#e9edef'
const TEXT_SEC = '#8696a0'
const HEADER_BG = '#1f2937'

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024

/** Desktop: rich branded toast with Pulse header + hyperlink */
const DesktopPulseToast = ({ sender, preview, onClick }: { sender: string; preview: string; onClick: () => void }) => (
  <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '1px' }}>
        SoundChain Pulse
      </span>
      <span style={{ fontSize: '10px', color: TEXT_SEC }}>just now</span>
    </div>
    <div style={{ fontSize: '14px', color: TEXT, lineHeight: '1.4' }}>
      <span style={{ fontWeight: 600 }}>{sender}</span>
      <span style={{ color: TEXT_SEC, marginLeft: '6px' }}>{preview.slice(0, 70)}{preview.length > 70 ? '...' : ''}</span>
    </div>
    <span style={{ fontSize: '11px', color: ACCENT, marginTop: '2px' }}>
      Open in Pulse →
    </span>
  </div>
)

/** Mobile: compact branded toast */
const MobilePulseToast = ({ sender, preview }: { sender: string; preview: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SoundChain Pulse</span>
      <span style={{ fontSize: '10px', color: TEXT_SEC }}>now</span>
    </div>
    <div style={{ fontSize: '13px', color: TEXT }}>
      <span style={{ fontWeight: 600 }}>{sender}</span>
      <span style={{ color: TEXT_SEC }}>{' '}{preview.slice(0, 60)}{preview.length > 60 ? '...' : ''}</span>
    </div>
  </div>
)

const mobileToastStyle = {
  cursor: 'pointer' as const,
  backgroundColor: HEADER_BG,
  borderLeft: `3px solid ${ACCENT}`,
  padding: '10px 14px',
}

function showPulseToast(sender: string, preview: string, onClick: () => void) {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200])
  playNotificationChime()

  if (isDesktop()) {
    toast(
      <DesktopPulseToast sender={sender} preview={preview} onClick={onClick} />,
      { containerId: 'pulse-desktop', onClick }
    )
  } else {
    toast(
      <MobilePulseToast sender={sender} preview={preview} />,
      { autoClose: 8000, onClick, style: mobileToastStyle }
    )
  }
}

const PulseGatewayListener = () => {
  const me = useMe()
  const router = useRouter()
  const { connected, fallbackPolling, on } = useOpenClawGateway(me?.id)

  // Warm up AudioContext on first user interaction anywhere on the site.
  // iOS requires a user gesture to unlock AudioContext — this ensures
  // playNotificationChime() works when a DM toast fires on any page.
  const warmedUpRef = useRef(false)
  useEffect(() => {
    if (warmedUpRef.current) return
    const handler = () => {
      warmUpAudio()
      warmedUpRef.current = true
      document.removeEventListener('click', handler, true)
      document.removeEventListener('touchstart', handler, true)
    }
    document.addEventListener('click', handler, true)
    document.addEventListener('touchstart', handler, true)
    return () => {
      document.removeEventListener('click', handler, true)
      document.removeEventListener('touchstart', handler, true)
    }
  }, [])

  // Track last-seen message timestamps per chat (for polling toast dedup)
  const prevChatsRef = useRef<Map<string, string>>(new Map())
  const seededRef = useRef(false)

  // WebSocket path — if connected, use event-based toasts
  useEffect(() => {
    if (!connected) return

    const unsubMessage = on('message.received', (payload) => {
      const sender = (payload.senderName as string) || 'Someone'
      const preview = (payload.message as string) || ''
      showPulseToast(sender, preview, () => router.push('/dex/pulse'))
    })

    const unsubNotification = on('notification', (payload) => {
      const text = (payload.text as string) || 'New notification'
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      playNotificationChime()

      if (isDesktop()) {
        toast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '1px' }}>SoundChain</span>
            <span style={{ fontSize: '14px', color: TEXT }}>{text}</span>
          </div>,
          { containerId: 'pulse-desktop' }
        )
      } else {
        toast(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SoundChain</span>
            <span style={{ fontSize: '13px', color: TEXT }}>{text}</span>
          </div>,
          { autoClose: 8000, style: mobileToastStyle }
        )
      }
    })

    return () => {
      unsubMessage()
      unsubNotification()
    }
  }, [connected, on])

  // Polling fallback — poll chats every 8s when WebSocket isn't available
  // Skip polling on the Pulse page itself (pulse.tsx has its own faster polling)
  const isOnPulse = router.pathname === '/dex/pulse'
  const shouldPoll = !connected && !!me && !isOnPulse

  const { data: chatsData } = useChatsQuery({
    pollInterval: shouldPoll ? 8000 : 0,
    skip: !shouldPoll,
  })

  // Detect new messages from polling → show toast
  useEffect(() => {
    if (!chatsData?.chats?.nodes?.length || isOnPulse) return

    const nodes = chatsData.chats.nodes
    const prev = prevChatsRef.current

    // First poll: seed the map without toasting
    if (!seededRef.current) {
      nodes.forEach((c) => prev.set(c.profile?.id || c.id, c.createdAt))
      seededRef.current = true
      return
    }

    for (const chat of nodes) {
      const profileId = chat.profile?.id || chat.id
      const lastSeen = prev.get(profileId)
      const isNew = !lastSeen || new Date(chat.createdAt).getTime() > new Date(lastSeen).getTime()

      if (isNew && chat.unread) {
        const sender = chat.profile?.displayName || 'Someone'
        const rawMsg = chat.message || ''
        const preview = /!\[!?emote:/.test(rawMsg)
          ? rawMsg.replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '😎')
          : rawMsg

        showPulseToast(sender, preview, () => router.push('/dex/pulse'))
      }

      prev.set(profileId, chat.createdAt)
    }
  }, [chatsData, isOnPulse, router])

  return null
}

export default PulseGatewayListener
