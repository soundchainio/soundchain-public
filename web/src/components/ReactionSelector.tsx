import classNames from 'classnames'
import { ReactionEmoji } from 'icons/ReactionEmoji'
import {
  useChangeReactionMutation,
  useReactToPostMutation,
  useRetractReactionMutation,
  useGuestReactToPostMutation,
  ReactionType,
} from 'lib/graphql-hooks'

interface ReactionSelectorProps {
  postId: string
  myReaction: ReactionType | null
  opened: boolean
  setOpened: (opened: boolean) => void
  isGuest?: boolean
  guestWallet?: string | null
}

const reactionTypes = [
  ReactionType.Sad,
  ReactionType.Happy,
  ReactionType.Horns,
  ReactionType.Sunglasses,
  ReactionType.Heart,
]

const baseListClasses =
  'list-none flex absolute right-0 duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4'

export const ReactionSelector = ({ postId, myReaction, opened, setOpened, isGuest, guestWallet }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation()
  const [changeReaction] = useChangeReactionMutation()
  const [retractReaction] = useRetractReactionMutation()
  const [guestReactToPost] = useGuestReactToPostMutation()

  const handleSelect = async (type: ReactionType) => {
    // Guest reaction - use guest mutation
    if (isGuest && guestWallet) {
      await guestReactToPost({
        variables: { input: { postId, type }, walletAddress: guestWallet },
        refetchQueries: ['Post', 'Posts'],
      })
      setOpened(false)
      return
    }

    // Logged-in user reactions
    if (type === myReaction) {
      await retractReaction({ variables: { input: { postId } } })
    } else if (myReaction) {
      await changeReaction({
        variables: { input: { postId, type } },
        refetchQueries: ['Post'],
      })
    } else {
      await reactToPost({
        variables: { input: { postId, type } },
        refetchQueries: ['Post'],
      })
    }

    setOpened(false)
  }

  const ListOptions = reactionTypes.map(reaction => {
    return (
      <li key={reaction} className="flex flex-1 cursor-pointer justify-center" onClick={() => handleSelect(reaction)}>
        <div
          className={classNames('rounded-lg px-3 py-2', {
            'bg-gray-40': myReaction === reaction,
            'opacity-50': myReaction && myReaction !== reaction,
          })}
        >
          <ReactionEmoji name={reaction} className="h-5 w-5" />
        </div>
      </li>
    )
  })

  return <ul className={`${baseListClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>
}
