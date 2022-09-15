import classNames from 'classnames'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { Verified } from 'icons/Verified'
import { forwardRef } from 'react'
import { limitTextToNumberOfCharacters } from 'utils/format'

interface DisplayNameProps {
  name: string
  verified?: boolean | null
  teamMember?: boolean | null
  className?: string
  maxNumberOfCharacters?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DisplayName = forwardRef<any, DisplayNameProps>(
  ({ name, verified, teamMember, className, maxNumberOfCharacters, ...props }, ref) => {
    return (
      <div className={classNames('flex min-w-0 items-baseline gap-1', className)} ref={ref}>
        <span {...props} className="truncate font-semibold text-white">
          {maxNumberOfCharacters ? limitTextToNumberOfCharacters(name, maxNumberOfCharacters) : name}
        </span>
        {teamMember ? (
          <SoundchainGoldLogo aria-label="SoundChain Team Member" className="flex-shrink-0" />
        ) : (
          verified && <Verified aria-label="Verified user" className="flex-shrink-0" />
        )}
      </div>
    )
  },
)

DisplayName.displayName = 'DisplayName'
