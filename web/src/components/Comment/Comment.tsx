import { NotAvailableMessage } from 'components/NotAvailableMessage'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { Role, useCommentQuery } from 'lib/graphql'
import NextLink from 'next/link'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { CommentSkeleton } from './CommentSkeleton'
import { DisplayName } from '../DisplayName'
import { Timestamp } from '../Timestamp'
import { EmoteRenderer } from '../EmoteRenderer'

interface CommentProps {
  commentId: string
}

export const Comment = ({ commentId }: CommentProps) => {
  const { data } = useCommentQuery({ variables: { id: commentId } })
  const me = useMe()
  const { dispatchShowAuthorActionsModal } = useModalDispatch()
  const comment = data?.comment
  const isGuest = comment?.isGuest && comment?.walletAddress
  const isAuthor = !isGuest && comment?.profile?.id == me?.profile.id
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember)

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal({
      showAuthorActions: true,
      authorActionsType: AuthorActionsType.COMMENT,
      authorActionsId: commentId,
      showOnlyDeleteOption: !isAuthor,
    })
  }

  if (!comment) return <CommentSkeleton />

  if (data?.comment.deleted) {
    return <NotAvailableMessage type="comment" />
  }

  return (
    <div className="flex flex-row space-x-3">
      {isGuest ? (
        <GuestAvatar walletAddress={comment.walletAddress!} pixels={40} className="mt-4" />
      ) : (
        <Avatar profile={comment.profile!} className="mt-4" />
      )}
      <div className="min-w-0 flex-1 rounded-xl bg-gray-20 py-4 px-4">
        <div className="flex min-w-0 items-center">
          <div className="flex min-w-0 flex-1 flex-col">
            {isGuest ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-200">
                  {formatWalletAddress(comment.walletAddress!)}
                </span>
                <span className="text-[8px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-medium">
                  Guest
                </span>
              </div>
            ) : (
              <NextLink href={`/profiles/${comment.profile!.userHandle}`}>
                <DisplayName
                  name={comment.profile!.displayName}
                  verified={comment.profile!.verified}
                  teamMember={comment.profile!.teamMember}
                  badges={comment.profile!.badges}
                />
              </NextLink>
            )}
            <Timestamp className="flex-1" datetime={comment.createdAt} />
          </div>
          <div className="w-9">
            {canEdit && <Ellipsis className="h-3 w-full cursor-pointer pr-2 pl-2" onClick={onEllipsisClick} />}
          </div>
        </div>
        <pre className="mt-1 whitespace-pre-wrap break-words text-sm font-thin tracking-wide text-white">
          <EmoteRenderer text={comment.body} linkify />
        </pre>
      </div>
    </div>
  )
}
