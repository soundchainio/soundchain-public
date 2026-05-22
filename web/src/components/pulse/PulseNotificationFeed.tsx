/**
 * PulseNotificationFeed — Unified notification hub for Pulse.
 *
 * Shows all SoundChain events grouped by time:
 *   Today, Yesterday, This Week, Earlier
 *
 * Each notification: avatar + action text + timestamp + link
 */

import React, { useEffect, useMemo } from 'react'
import {
  NotificationCountDocument,
  SortNotificationField,
  SortOrder,
  NotificationType,
  useNotificationQuery,
  useResetNotificationCountMutation,
  useClearNotificationsMutation,
} from 'lib/graphql'
import { useNotifications as useNotificationsQuery } from 'hooks/useNotificationsDirect'  // Phase 7e — Vercel-direct
import { Avatar } from 'components/Avatar'
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from 'date-fns'
import { Bell, Trash2, UserPlus, Heart, MessageCircle, ShoppingBag, Coins, Star } from 'lucide-react'

// Map notification type to human-readable action + icon
const NOTIFICATION_META: Record<string, { action: string; Icon: React.FC<{ className?: string }>; color: string }> = {
  [NotificationType.Follower]: { action: 'started following you', Icon: UserPlus, color: 'text-cyan-400' },
  [NotificationType.Reaction]: { action: 'liked your post', Icon: Heart, color: 'text-pink-400' },
  [NotificationType.Comment]: { action: 'commented on your post', Icon: MessageCircle, color: 'text-blue-400' },
  [NotificationType.NewPost]: { action: 'made a new post', Icon: Star, color: 'text-yellow-400' },
  [NotificationType.NftSold]: { action: 'bought your NFT', Icon: ShoppingBag, color: 'text-green-400' },
  [NotificationType.NewBid]: { action: 'placed a bid', Icon: Coins, color: 'text-orange-400' },
  [NotificationType.WonAuction]: { action: 'won your auction', Icon: Coins, color: 'text-emerald-400' },
  [NotificationType.Outbid]: { action: 'outbid you', Icon: Coins, color: 'text-red-400' },
  [NotificationType.AuctionIsEnding]: { action: 'auction is ending soon', Icon: Bell, color: 'text-amber-400' },
  [NotificationType.AuctionEnded]: { action: 'auction has ended', Icon: Bell, color: 'text-gray-400' },
  [NotificationType.DeletedPost]: { action: 'post was removed', Icon: Trash2, color: 'text-gray-500' },
  [NotificationType.DeletedComment]: { action: 'comment was removed', Icon: Trash2, color: 'text-gray-500' },
  [NotificationType.VerificationRequestUpdate]: { action: 'verification updated', Icon: Star, color: 'text-purple-400' },
  [NotificationType.NewVerificationRequest]: { action: 'new verification request', Icon: Star, color: 'text-purple-400' },
}

interface NotificationRowProps {
  notificationId: string
}

const NotificationRow = ({ notificationId }: NotificationRowProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } })
  const notification = data?.notification
  if (!notification) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-[#1f2c34]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[#1f2c34] rounded w-3/4" />
          <div className="h-2 bg-[#1f2c34] rounded w-1/2" />
        </div>
      </div>
    )
  }

  const meta = NOTIFICATION_META[notification.type] || {
    action: 'sent you a notification',
    Icon: Bell,
    color: 'text-gray-400',
  }

  // Extract common fields from the polymorphic notification
  const n = notification as Record<string, unknown>
  const link = (n.link as string) || '/nodes'
  const createdAt = n.createdAt as string
  const name = (n.followerName || n.commenterName || n.reactorName || n.bidderName || n.buyerName || '') as string
  const picture = (n.followerPicture || n.commenterPicture || n.reactorPicture || '') as string | null

  // Open notification links in system browser (Safari) when running as PWA standalone
  // Prevents glitchy main-site layout loading inside the Pulse PWA shell
  const handleTap = () => {
    if (!link || link === '/dex' || link === '/nodes') return
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    if (isStandalone) {
      window.open(link, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = link
    }
  }

  return (
    <div
      onClick={handleTap}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#1f2c34]/50 transition-colors cursor-pointer active:bg-[#1f2c34]"
    >
      <div className="relative flex-shrink-0">
        <Avatar profile={{ profilePicture: picture }} linkToProfile={false} pixels={40} />
        <div className={`absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#0b141a] ${meta.color}`}>
          <meta.Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e9edef] leading-tight">
          {name && <span className="font-semibold">{name} </span>}
          <span className="text-[#8696a0]">{meta.action}</span>
        </p>
        {createdAt && (
          <p className="text-xs text-[#8696a0] mt-0.5">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  )
}

// Group notifications by time period
function groupByTime(ids: string[], timestamps: Map<string, string>) {
  const groups: { label: string; ids: string[] }[] = [
    { label: 'Today', ids: [] },
    { label: 'Yesterday', ids: [] },
    { label: 'This Week', ids: [] },
    { label: 'Earlier', ids: [] },
  ]
  const weekAgo = subDays(new Date(), 7)

  for (const id of ids) {
    const ts = timestamps.get(id)
    if (!ts) {
      groups[3].ids.push(id)
      continue
    }
    const d = new Date(ts)
    if (isToday(d)) groups[0].ids.push(id)
    else if (isYesterday(d)) groups[1].ids.push(id)
    else if (isAfter(d, weekAgo)) groups[2].ids.push(id)
    else groups[3].ids.push(id)
  }

  return groups.filter((g) => g.ids.length > 0)
}

export const PulseNotificationFeed = () => {
  const [resetNotificationCount] = useResetNotificationCountMutation()
  const [clearNotifications] = useClearNotificationsMutation()

  const { data, loading, error, refetch } = useNotificationsQuery({
    variables: { sort: { field: SortNotificationField.CreatedAt, order: SortOrder.Desc } },
    fetchPolicy: 'no-cache',
  })

  // Only reset badge count AFTER notifications have loaded — prevents clearing badge before user sees data
  useEffect(() => {
    if (data && data.notifications?.nodes) {
      resetNotificationCount({ refetchQueries: [NotificationCountDocument] })
    }
  }, [data, resetNotificationCount])

  const nodes = data?.notifications?.nodes || []

  const timestamps = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of nodes) {
      const raw = n as Record<string, unknown>
      if (raw.createdAt) m.set(n.id, raw.createdAt as string)
    }
    return m
  }, [nodes])

  const groups = useMemo(
    () => groupByTime(nodes.map((n) => n.id), timestamps),
    [nodes, timestamps]
  )

  const handleClearAll = async () => {
    await clearNotifications()
    refetch()
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#1f2c34]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#1f2c34] rounded w-3/4" />
              <div className="h-2 bg-[#1f2c34] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    console.error('[PulseNotificationFeed] Query error:', error.message)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8 gap-3">
        <Bell className="w-12 h-12 text-red-400/50 mb-1" />
        <p className="text-[#e9edef] text-sm font-semibold">Could not load notifications</p>
        <p className="text-[#8696a0] text-xs max-w-[260px]">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-[#00a884] hover:text-[#00d4a4] transition-colors mt-1 px-3 py-1.5 rounded-full border border-[#00a884]/30"
        >
          Try again
        </button>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <Bell className="w-12 h-12 text-[#8696a0]/30 mb-3" />
        <p className="text-[#8696a0] text-sm">No notifications yet</p>
        <p className="text-[#8696a0]/60 text-xs mt-1">
          When someone follows you, likes your post, or interacts with your content, it&apos;ll show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Clear all button */}
      <div className="flex items-center justify-end px-4 py-2">
        <button
          onClick={handleClearAll}
          className="text-xs text-[#00a884] hover:text-[#00d4a4] transition-colors"
        >
          Clear all
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-4 py-2 sticky top-0 bg-[#0b141a]/95 backdrop-blur-sm z-10">
            <span className="text-xs font-semibold text-[#00a884] uppercase tracking-wider">
              {group.label}
            </span>
          </div>
          {group.ids.map((id) => (
            <NotificationRow key={id} notificationId={id} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default PulseNotificationFeed
