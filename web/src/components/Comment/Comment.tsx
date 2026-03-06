import { NotAvailableMessage } from 'components/NotAvailableMessage'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { Role, useCommentQuery } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
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
import { Share2, Film, MessageCircle, Trash2 } from 'lucide-react'
import { useDeleteCommentMutation } from 'lib/graphql'

interface CommentProps {
  commentId: string
  onReplyClick?: () => void
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
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [deleteComment] = useDeleteCommentMutation()

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
            <NextLink href={`/dex/users/${comment.profile!.userHandle}`}>
              <DisplayName
                name={comment.profile!.displayName}
                verified={comment.profile!.verified}
                teamMember={comment.profile!.teamMember}
                badges={comment.profile!.badges}
                className="text-xs"
              />
            </NextLink>
          ) : (
            <span className="text-xs text-neutral-400">Unknown user</span>
          )}
          <Timestamp className="text-gray-600 text-[10px]" datetime={comment.createdAt} small />
          {canEdit && <Ellipsis className="h-3 w-3 cursor-pointer text-gray-600 hover:text-gray-400 ml-auto" onClick={onEllipsisClick} />}
        </div>
        <div className="text-gray-300 text-xs mt-0.5 whitespace-pre-wrap break-words">
          <EmoteRenderer text={comment.body} linkify />
        </div>
        {/* Comment action pills */}
        <div className="flex items-center gap-2.5 mt-1.5">
          {me && onReplyClick && (
            <button
              onClick={onReplyClick}
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
