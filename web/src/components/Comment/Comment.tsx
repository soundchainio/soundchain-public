import { NotAvailableMessage } from 'components/NotAvailableMessage'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { Role, PageInput } from 'lib/graphql'
import { useComment as useCommentQuery, useCommentsLazy as useCommentsLazyQuery } from 'hooks/useCommentsDirect'  // Phase 7e — Vercel-direct
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { createPortal } from 'react-dom'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { CommentSkeleton } from './CommentSkeleton'
import { DisplayName } from '../DisplayName'
import { Timestamp } from '../Timestamp'
import { EmoteRenderer } from '../EmoteRenderer'
import { SharePostModal } from '../modals/SharePostModal'
import { CreateStoryModal } from '../dex/CreateStoryModal'
import { Share2, Film, MessageCircle, Trash2, ChevronDown } from 'lucide-react'
// useDeleteCommentMutation migrated to Vercel direct (Phase 5c)

interface CommentProps {
  commentId: string
  onReplyClick?: (authorName?: string) => void
}

export const Comment = ({ commentId, onReplyClick }: CommentProps) => {
  const { data } = useCommentQuery({ variables: { id: commentId } })
  const me = useMe()
  const router = useRouter()
  const { dispatchShowAuthorActionsModal } = useModalDispatch()
  const comment = data?.comment
  const isGuest = comment?.isGuest && comment?.walletAddress
  const hasProfile = !!comment?.profile
  const isAuthor = !isGuest && hasProfile && comment?.profile?.id === me?.profile?.id
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showStoryModal, setShowStoryModal] = useState(false)
  // YouTube-style replies: collapsed by default behind the "N replies" toggle
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const deleteComment = async ({ variables }: any) => {
    await fetch('/api/posts/comment-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: variables.id }),
    })
  }

  useEffect(() => {
    setPortalContainer(document.body)
  }, [])

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal({
      showAuthorActions: true,
      authorActionsType: AuthorActionsType.COMMENT,
      authorActionsId: commentId,
      showOnlyDeleteOption: !isAuthor,
    })
  }

  const onShareClick = () => {
    if (me) {
      setShowShareModal(true)
      return
    }
    // Fallback: copy link or native share
    const postUrl = `${window.location.origin}/posts/${comment?.postId || ''}`
    try {
      navigator.share({ title: 'SoundChain', text: comment?.body || 'Check this out!', url: postUrl }).catch(() => {
        navigator.clipboard.writeText(postUrl)
        toast('Link copied to clipboard')
      })
    } catch {
      navigator.clipboard.writeText(postUrl)
      toast('Link copied to clipboard')
    }
  }

  // Check if comment body has embeddable media (YouTube, Spotify, etc.) for Story sharing
  const hasEmbeddableMedia = comment?.body && /(?:youtube\.com|youtu\.be|vimeo\.com|spotify\.com|soundcloud\.com)/i.test(comment.body)

  if (!comment) return <CommentSkeleton />

  if (data?.comment.deleted) {
    return <NotAvailableMessage type="comment" />
  }

  return (
    <div className="flex items-start gap-2">
      {isGuest ? (
        <GuestAvatar walletAddress={comment.walletAddress!} pixels={24} className="w-6 h-6 flex-shrink-0" />
      ) : hasProfile ? (
        <Avatar profile={comment.profile!} pixels={24} className="w-6 h-6 flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-[10px] flex-shrink-0">?</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isGuest ? (
            <>
              <span className="text-xs font-semibold text-neutral-200">
                {formatWalletAddress(comment.walletAddress!)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
                Guest
              </span>
            </>
          ) : hasProfile ? (
            <NextLink href={comment.profile!.userHandle ? `/users/${comment.profile!.userHandle}` : '#'}>
              <DisplayName
                name={comment.profile!.displayName}
                verified={comment.profile!.verified}
                teamMember={comment.profile!.teamMember}
                badges={comment.profile!.badges}
                userHandle={comment.profile!.userHandle}
                tracksCount={(comment.profile as any)?.tracksCount}
                className="text-xs"
              />
            </NextLink>
          ) : (
            <span className="text-xs text-neutral-400">Unknown user</span>
          )}
          <Timestamp className="text-gray-600 text-[10px]" datetime={comment.createdAt} small />
          {canEdit && <Ellipsis className="h-3 w-3 cursor-pointer text-gray-600 hover:text-gray-400 ml-auto" onClick={onEllipsisClick} />}
        </div>
        {comment.replyToId && comment.replyTo && (
          <div className="text-[10px] text-cyan-500/70 mt-0.5">
            replying to @{comment.replyTo.profile?.displayName || comment.replyTo.profile?.userHandle || (comment.replyTo.isGuest && comment.replyTo.walletAddress ? formatWalletAddress(comment.replyTo.walletAddress) : 'someone')}
          </div>
        )}
        <div className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap break-words">
          <EmoteRenderer text={comment.body} linkify />
        </div>
        {/* Comment action pills */}
        <div className="flex items-center gap-2.5 mt-1.5">
          {me && onReplyClick && (
            <button
              onClick={() => onReplyClick(comment.profile?.displayName || comment.profile?.userHandle || (isGuest ? formatWalletAddress(comment.walletAddress!) : undefined))}
              className="flex items-center gap-1 text-gray-600 hover:text-cyan-400 transition-colors text-[10px]"
              title="Reply"
            >
              <MessageCircle className="w-2.5 h-2.5" />
              Reply
            </button>
          )}
          <button
            onClick={onShareClick}
            className="flex items-center gap-1 text-gray-600 hover:text-cyan-400 transition-colors text-[10px]"
            title="Share"
          >
            <Share2 className="w-2.5 h-2.5" />
            Share
          </button>
          {me && hasEmbeddableMedia && (
            <button
              onClick={() => setShowStoryModal(true)}
              className="flex items-center gap-1 text-gray-600 hover:text-pink-400 transition-colors text-[10px]"
              title="Share to Story"
            >
              <Film className="w-2.5 h-2.5" />
              Story
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                if (confirm('Delete this comment?')) {
                  deleteComment({ variables: { id: commentId }, refetchQueries: ['Comments'] })
                    .then(() => toast.success('Comment deleted'))
                    .catch(() => toast.error('Could not delete'))
                }
              }}
              className="flex items-center gap-1 text-gray-600 hover:text-red-400 transition-colors text-[10px]"
              title="Delete"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Replies — YouTube-style: collapsed by default behind a "N replies" toggle
          (replier avatar + true total count + chevron), expands the thread inline.
          Mirrors the feed/wall InlineComment behavior. */}
      {(() => {
        const nodes = comment.replies?.nodes || []
        const totalReplies = comment.replyCount ?? nodes.length
        if (totalReplies <= 0) return null
        const first = nodes[0]
        return (
          <div className="mt-1.5 ml-8">
            <button
              onClick={() => {
                if (nodes.length > 0) setRepliesExpanded((v) => !v)
                else if (comment.postId) window.location.href = `/posts/${comment.postId}`
              }}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {!repliesExpanded && first && (
                first.isGuest && first.walletAddress ? (
                  <GuestAvatar walletAddress={first.walletAddress} pixels={18} className="w-[18px] h-[18px] flex-shrink-0" />
                ) : first.profile ? (
                  <Avatar profile={first.profile} pixels={18} className="w-[18px] h-[18px] flex-shrink-0" />
                ) : null
              )}
              <span className="text-[11px] font-semibold">
                {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${repliesExpanded ? '' : '-rotate-90'}`} />
            </button>
            {repliesExpanded && nodes.length > 0 && (
              <div className="mt-2 pl-3 border-l-2 border-white/10 space-y-2">
                {nodes.map((reply: any) => (
                  <Comment key={reply.id} commentId={reply.id} onReplyClick={onReplyClick} />
                ))}
                {(comment.replyCount ?? 0) > nodes.length && (
                  <button
                    onClick={() => { if (comment.postId) window.location.href = `/posts/${comment.postId}` }}
                    className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-cyan-400 transition-colors py-0.5"
                  >
                    <ChevronDown className="w-2.5 h-2.5 -rotate-90" />
                    View {(comment.replyCount ?? 0) - nodes.length} more {(comment.replyCount ?? 0) - nodes.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Share Post Modal (DM share) */}
      {portalContainer && showShareModal && createPortal(
        <SharePostModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postId={comment.postId || commentId}
          postBody={comment.body}
          onShareToStory={me && hasEmbeddableMedia ? () => { setShowShareModal(false); setShowStoryModal(true) } : undefined}
        />,
        portalContainer
      )}

      {/* Create Story Modal */}
      {portalContainer && showStoryModal && hasEmbeddableMedia && createPortal(
        <CreateStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          prefillMedia={{
            url: comment.body!.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|open\.spotify\.com\/|soundcloud\.com\/)[\S]+/i)?.[0] || '',
            type: 'video' as const,
            caption: comment.body || undefined,
            authorName: comment.profile?.displayName || comment.profile?.userHandle || undefined,
          }}
        />,
        portalContainer
      )}
    </div>
  )
}
