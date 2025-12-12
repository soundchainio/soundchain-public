import classNames from 'classnames'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { Verified } from 'icons/Verified'
import { Badge, Maybe } from 'lib/graphql'
import Image from 'next/image'
import { forwardRef } from 'react'
import { limitTextToNumberOfCharacters } from 'utils/format'
import { Crown, Medal, Award } from 'lucide-react'

// POAP Badge for leaderboard positions
const POAPBadge = ({ position }: { position: 1 | 2 | 3 }) => {
  const configs = {
    1: {
      gradient: 'from-yellow-400 via-amber-500 to-orange-500',
      icon: Crown,
      title: 'Genre Champion',
    },
    2: {
      gradient: 'from-gray-300 via-slate-400 to-gray-500',
      icon: Medal,
      title: 'Genre Runner Up',
    },
    3: {
      gradient: 'from-amber-600 via-orange-700 to-amber-800',
      icon: Award,
      title: 'Genre Third Place',
    },
  }

  const config = configs[position]
  const IconComponent = config.icon

  return (
    <div
      className={`relative w-5 h-5 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}
      title={config.title}
    >
      <IconComponent className="w-3 h-3 text-white" />
    </div>
  )
}

interface DisplayNameProps {
  name: string
  verified?: boolean | null
  teamMember?: boolean | null
  className?: string
  maxNumberOfCharacters?: number
  badges?: Maybe<Badge[]>
  leaderboardPosition?: 1 | 2 | 3 | null  // POAP badge for top 3 in genre leaderboard
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DisplayName = forwardRef<any, DisplayNameProps>(
  ({ name, verified, teamMember, className, maxNumberOfCharacters, badges, leaderboardPosition, ...props }, ref) => {
    const badgeDimension = 20
    return (
      <div className={classNames('flex min-w-0 items-center gap-1', className)} ref={ref}>
        <span {...props} className="truncate font-semibold text-white">
          {maxNumberOfCharacters ? limitTextToNumberOfCharacters(name, maxNumberOfCharacters) : name}
        </span>
        {teamMember ? (
          <SoundchainGoldLogo aria-label="SoundChain Team Member" className="ml-0.5 flex-shrink-0" />
        ) : (
          verified && <Verified aria-label="Verified user" className="ml-0.5 flex-shrink-0" />
        )}
        {/* POAP Leaderboard Badge */}
        {leaderboardPosition && leaderboardPosition >= 1 && leaderboardPosition <= 3 && (
          <POAPBadge position={leaderboardPosition} />
        )}
        {/* Event Supporter Badge */}
        {badges && badges.includes(Badge.SupporterFirstEventAeSc) && (
          <Image alt="Event Supporter Badge" src={'/badges/badge-01.svg'} width={badgeDimension} height={badgeDimension} className="flex-shrink-0" />
        )}
      </div>
    )
  },
)

DisplayName.displayName = 'DisplayName'
