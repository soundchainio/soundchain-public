import classNames from 'classnames';
import { Verified } from 'icons/Verified';

interface DisplayNameProps {
  name: string;
  verified?: boolean | null;
  className?: string;
}

export const DisplayName = ({ name, verified, className, ...props }: DisplayNameProps) => {
  return (
    <div className={classNames('flex gap-1 items-baseline', className)}>
      <span {...props} className="text-white font-semibold truncate">
        {name}
      </span>
      {verified && <Verified aria-label="Verified user" className="flex-shrink-0" />}
    </div>
  );
};
