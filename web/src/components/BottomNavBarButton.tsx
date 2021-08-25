import classNames from 'classnames';
import { IconProps } from 'icons/types/IconProps';
import { useRouter } from 'next/router';

interface BottomNavBarButtonProps {
  badge?: () => JSX.Element;
  label: string;
  path?: string;
  onClick?: () => void;
  icon?: (props: IconProps) => JSX.Element;
  activatedColor?: 'yellow' | 'green' | 'purple' | 'green-purple';
}

export const BottomNavBarButton = ({
  label,
  path,
  icon: Icon,
  onClick,
  badge: Badge,
  activatedColor,
}: BottomNavBarButtonProps) => {
  const router = useRouter();
  const onButtonClick = () => {
    if (onClick) {
      onClick();
    }
    if (path) {
      router.push(path);
    }
  };

  const isActivated = () => {
    return router.pathname === path;
  };

  return (
    <div onClick={onButtonClick} className="flex flex-col flex-1 items-center justify-center align-middle ">
      {Icon && (
        <div className="relative">
          {Badge && <Badge />}
          <Icon activated={isActivated()} />
        </div>
      )}
      <span
        className={classNames(
          'text-gray-50 text-xs mt-2 font-semibold',
          isActivated() && `${activatedColor}-gradient-text`,
        )}
      >
        {label}
      </span>
    </div>
  );
};
