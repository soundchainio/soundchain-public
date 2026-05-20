import { useState, useEffect, useRef } from 'react'
import { X, Search, Send, Copy, Check, Film, Link2 } from 'lucide-react'
import { Avatar } from 'components/Avatar'
import { useMe } from 'hooks/useMe'
import { useSendMessageMutation, useChatsLazyQuery } from 'lib/graphql'
import { useFollowingLazy as useFollowingLazyQuery } from 'hooks/useUsersSocialDirect'  // Phase 7e — Vercel-direct
import { toast } from 'react-toastify'

interface ShareRecipient {
  id: string
  displayName?: string | null
  userHandle?: string | null
  profilePicture?: string | null
  verified?: boolean | null
}

interface SharePostModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  postBody?: string | null
  onShareToStory?: () => void
  customUrl?: string
}

export const SharePostModal = ({ isOpen, onClose, postId, postBody, onShareToStory, customUrl }: SharePostModalProps) => {
  const me = useMe()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const [loadChats, { data: chatsData }] = useChatsLazyQuery({ fetchPolicy: 'cache-and-network' })
  const [loadFollowing, { data: followingData }] = useFollowingLazyQuery()
  const [sendMessage] = useSendMessageMutation()

  const postUrl = customUrl || (typeof window !== 'undefined' ? `${window.location.origin}/posts/${postId}` : '')

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && me?.profile?.id) {
      loadChats({ variables: { page: { first: 20 } } })
      loadFollowing({ variables: { profileId: me.profile.id, page: { first: 50 } } })
      setSelectedIds(new Set())
      setSentIds(new Set())
      setSearch('')
      setCopied(false)
      // Auto-focus search on desktop
      setTimeout(() => searchRef.current?.focus(), 200)
    }
  }, [isOpen, me?.profile?.id])

  if (!isOpen) return null

  // Build unique recipient list: recent chats first, then following
  const recipients: ShareRecipient[] = []
  const seenIds = new Set<string>()

  // Recent conversations
  chatsData?.chats?.nodes?.forEach(chat => {
    if (chat.profile && !seenIds.has(chat.profile.id)) {
      seenIds.add(chat.profile.id)
      recipients.push({
        id: chat.profile.id,
        displayName: chat.profile.displayName,
        userHandle: chat.profile.userHandle,
        profilePicture: chat.profile.profilePicture,
        verified: chat.profile.verified,
      })
    }
  })

  // Following
  followingData?.following?.nodes?.forEach(node => {
    const p = node.followedProfile
    if (p && !seenIds.has(p.id)) {
      seenIds.add(p.id)
      recipients.push({
        id: p.id,
        displayName: p.displayName,
        userHandle: p.userHandle,
        profilePicture: p.profilePicture,
        verified: p.verified,
      })
    }
  })

  // Filter by search
  const filtered = search.trim()
    ? recipients.filter(r =>
        r.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        r.userHandle?.toLowerCase().includes(search.toLowerCase())
      )
    : recipients

  const toggleSelect = (id: string) => {
    if (sentIds.has(id)) return // Already sent
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (selectedIds.size === 0 || sending) return
    setSending(true)

    // Strip emote/sticker/GIF markdown so raw syntax doesn't leak into DMs or texts
    const cleanBody = postBody
      ? postBody
          .replace(/!\[!?emote:[^\]]*\]\([^)]*\)/g, '')
          .replace(/!\[!?sticker:[^\]]*\]\([^)]*\)/g, '')
          .replace(/!\[!?gif:[^\]]*\]\([^)]*\)/g, '')
          .trim()
      : ''
    const snippet = cleanBody ? cleanBody.slice(0, 80) + (cleanBody.length > 80 ? '...' : '') : ''
    const message = snippet
      ? `${snippet}\n\n${postUrl}`
      : `Check this out on SoundChain!\n\n${postUrl}`

    try {
      for (const profileId of selectedIds) {
        const resp = await fetch('/api/dm/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toId: profileId, message }),
        })
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Share failed')
      }
      setSentIds(prev => new Set([...prev, ...selectedIds]))
      setSelectedIds(new Set())
      toast.success(`Sent to ${selectedIds.size} ${selectedIds.size === 1 ? 'person' : 'people'}`)
    } catch (err) {
      console.error('Share DM error:', err)
      toast.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('Link copied')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full sm:w-[420px] max-h-[80vh] bg-neutral-900 border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-base">Share</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm text-gray-300"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>
          {onShareToStory && (
            <button
              onClick={() => { onClose(); onShareToStory() }}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-cyan-500/20 rounded-xl transition-colors text-sm text-gray-300 hover:text-cyan-400"
            >
              <Film className="w-4 h-4" />
              <span>Story</span>
            </button>
          )}
          <button
            onClick={() => {
              try {
                navigator.share({ title: 'SoundChain', text: 'Check out this post!', url: postUrl }).catch(() => {})
              } catch { navigator.clipboard.writeText(postUrl); toast('Link copied') }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm text-gray-300"
          >
            <Link2 className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        {/* Recipients list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-[200px]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              {search ? 'No matches' : 'No conversations yet'}
            </div>
          ) : (
            filtered.map(r => {
              const isSelected = selectedIds.has(r.id)
              const isSent = sentIds.has(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isSent ? 'opacity-50' : isSelected ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                  }`}
                  disabled={isSent}
                >
                  <Avatar profile={{ profilePicture: r.profilePicture }} pixels={40} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-white font-medium truncate">{r.displayName || r.userHandle}</span>
                      {r.verified && <span className="text-cyan-400 text-xs">✓</span>}
                    </div>
                    <span className="text-xs text-gray-500 truncate block">@{r.userHandle}</span>
                  </div>
                  {/* Selection indicator */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSent ? 'border-green-500 bg-green-500' : isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-gray-600'
                  }`}>
                    {(isSent || isSelected) && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Send button */}
        {selectedIds.size > 0 && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Sending...' : `Send to ${selectedIds.size} ${selectedIds.size === 1 ? 'person' : 'people'}`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
