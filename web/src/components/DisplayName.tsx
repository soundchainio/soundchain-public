import classNames from 'classnames';
import { Verified } from 'icons/Verified';
import { forwardRef } from 'react';

interface DisplayNameProps {
  name: string;
  verified?: boolean | null;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DisplayName = forwardRef<any, DisplayNameProps>(({ name, verified, className, ...props }, ref) => {
  return (
    <div className={classNames('flex gap-1 items-baseline', className)} ref={ref}>
      <span {...props} className="text-white font-semibold truncate">
        {name}
      </span>
      {verified && <Verified aria-label="Verified user" className="flex-shrink-0" />}
    </div>
  );
});

DisplayName.displayName = 'DisplayName';
