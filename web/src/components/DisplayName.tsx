import classNames from 'classnames';
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo';
import { Verified } from 'icons/Verified';
import { Role, useMeQuery } from 'lib/graphql';
import { forwardRef } from 'react';

interface DisplayNameProps {
  name: string;
  verified?: boolean | null;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DisplayName = forwardRef<any, DisplayNameProps>(({ name, verified, className, ...props }, ref) => {
  const { data: { me } = {} } = useMeQuery();
  return (
    <div className={classNames('flex gap-1 items-baseline', className)} ref={ref}>
      <span {...props} className="text-white font-semibold truncate">
        {name}
      </span>
      {me?.roles.includes(Role.TeamMember) ? (
        <SoundchainGoldLogo aria-label="Soundchain Team Member" className="flex-shrink-0" />
      ) : (
        verified && <Verified aria-label="Verified user" className="flex-shrink-0" />
      )}
    </div>
  );
});

DisplayName.displayName = 'DisplayName';
