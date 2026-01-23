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
  // Desktop hover mode - renders inline instead of sliding
  inline?: boolean
}

const reactionTypes = [
  ReactionType.Sad,
  ReactionType.Happy,
  ReactionType.Horns,
  ReactionType.Sunglasses,
  ReactionType.Heart,
]

// Emoji labels for tooltip
const reactionLabels: Record<ReactionType, string> = {
  [ReactionType.Sad]: 'Fire',
  [ReactionType.Happy]: '100',
  [ReactionType.Horns]: 'Rocket',
  [ReactionType.Sunglasses]: 'Cool',
  [ReactionType.Heart]: 'Love',
}

const baseListClasses =
  'list-none flex absolute right-0 duration-500 ease-in-out bg-gray-25 transform-gpu transform w-3/4'

export const ReactionSelector = ({ postId, myReaction, opened, setOpened, isGuest, guestWallet, inline }: ReactionSelectorProps) => {
  const [reactToPost] = useReactToPostMutation()
  const [changeReaction] = useChangeReactionMutation()
  const [retractReaction] = useRetractReactionMutation()
  const [guestReactToPost] = useGuestReactToPostMutation()

  const handleSelect = async (type: ReactionType) => {
    // Guest reaction with wallet - use guest mutation
    if (isGuest && guestWallet) {
      await guestReactToPost({
        variables: { input: { postId, type }, walletAddress: guestWallet },
        refetchQueries: ['Post', 'Posts'],
      })
      setOpened(false)
      return
    }

    // Anonymous reaction (no account, no wallet) - generate random wallet address
    if (!isGuest && !guestWallet && !myReaction) {
      // Generate a random wallet address for anonymous reactions
      const hexChars = '0123456789abcdef'
      let addressBody = ''
      for (let i = 0; i < 40; i++) {
        addressBody += hexChars[Math.floor(Math.random() * 16)]
      }
      const anonymousAddress = `0x${addressBody}`
      await guestReactToPost({
        variables: { input: { postId, type }, walletAddress: anonymousAddress },
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
    const isSelected = myReaction === reaction
    return (
      <li
        key={reaction}
        className="flex cursor-pointer justify-center group"
        onClick={() => handleSelect(reaction)}
        title={reactionLabels[reaction]}
      >
        <div
          className={classNames(
            'relative rounded-xl px-2 py-1.5 transition-all duration-200',
            inline ? 'hover:bg-neutral-700 hover:scale-125' : 'px-3 py-2',
            {
              'bg-cyan-500/20 ring-1 ring-cyan-500/50': isSelected,
              'opacity-60 hover:opacity-100': myReaction && !isSelected,
            }
          )}
        >
          {/* Emoji with sparkle shimmer effect */}
          <span className="relative block">
            <ReactionEmoji name={reaction} className={inline ? 'h-6 w-6' : 'h-5 w-5'} />
            {/* Sparkle overlay - sophisticated shimmer */}
            <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer rounded-full pointer-events-none" />
            {/* Glow effect on hover */}
            <span className="absolute -inset-1 bg-gradient-radial from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-sm" />
          </span>
        </div>
      </li>
    )
  })

  // Inline mode for desktop hover - no sliding animation
  if (inline) {
    return <ul className="list-none flex items-center gap-0.5">{ListOptions}</ul>
  }

  // Mobile mode - slide in animation
  return <ul className={`${baseListClasses} ${opened ? 'translate-x-4/4' : 'translate-x-full'}`}>{ListOptions}</ul>
}
