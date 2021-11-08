import classNames from 'classnames';
import { Verified } from 'icons/Verified';

interface DisplayNameProps {
  name: string;
  verified?: boolean | null;
  className?: string;
}

export const DisplayName = ({ name, verified, className, ...props }: DisplayNameProps) => {
  return (
    <div className="flex gap-1 min-w-0">
      <span {...props} className={classNames('text-white font-semibold truncate', className)}>
        {name}
      </span>
      {verified && <Verified aria-label="Verified user" className="flex-shrink-0" />}
    </div>
  );
};
