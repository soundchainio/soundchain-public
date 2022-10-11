import classNames from 'classnames'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { Verified } from 'icons/Verified'
import { Badge, Maybe } from 'lib/graphql'
import Image from 'next/image'
import { forwardRef } from 'react'
import { limitTextToNumberOfCharacters } from 'utils/format'

interface DisplayNameProps {
  name: string
  verified?: boolean | null
  teamMember?: boolean | null
  className?: string
  maxNumberOfCharacters?: number
  badges?: Maybe<Badge[]>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DisplayName = forwardRef<any, DisplayNameProps>(
  ({ name, verified, teamMember, className, maxNumberOfCharacters, badges, ...props }, ref) => {
    const badgeDimension = 28
    return (
      <div className={classNames('flex min-w-0 items-center gap-1', className)} ref={ref}>
        <span {...props} className="truncate font-semibold text-white">
          {maxNumberOfCharacters ? limitTextToNumberOfCharacters(name, maxNumberOfCharacters) : name}
        </span>
        {teamMember ? (
          <SoundchainGoldLogo aria-label="SoundChain Team Member" className="ml-1 flex-shrink-0" />
        ) : (
          verified && <Verified aria-label="Verified user" className="ml-1 flex-shrink-0" />
        )}
        {badges && badges.includes(Badge.SupporterFirstEventAeSc) && (
          <Image alt="badge" src={'/badges/badge-01.svg'} width={badgeDimension} height={badgeDimension} />
        )}
      </div>
    )
  },
)

DisplayName.displayName = 'DisplayName'
