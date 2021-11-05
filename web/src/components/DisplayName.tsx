import classNames from 'classnames';
import { Verified } from 'icons/Verified';

interface DisplayNameProps {
  name: string;
  verified?: boolean | null;
  className?: string;
}

export const DisplayName = ({ name, verified, className, ...props }: DisplayNameProps) => {
  return (
    <div {...props} className={classNames('text-white font-semibold flex gap-2 items-center', className)}>
      {name}
      {verified && (
        <span className="flex-shrink-0">
          <Verified />
        </span>
      )}
    </div>
  );
};
