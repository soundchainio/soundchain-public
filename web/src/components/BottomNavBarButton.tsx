import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface BottomNavBarButtonProps {
  badge?: () => JSX.Element;
  label: string;
  path?: string;
  onClick?: () => void;
  icon?: (props: IconProps) => JSX.Element;
  activatedColor?: SVGGradientColor;
}

export const BottomNavBarButton = ({
  label,
  path,
  icon: Icon,
  onClick,
  badge: Badge,
  activatedColor,
}: BottomNavBarButtonProps) => {
  const [isActive, setActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.asPath === path) {
      setActive(true);
    }
  }, [router.asPath, path]);

  const onButtonClick = () => {
    setActive(true);

    if (onClick) {
      onClick();
    }
    if (path) {
      router.push(path);
    }
  };

  return (
    <div
      onClick={onButtonClick}
      className="flex flex-col flex-1 items-center justify-center align-middle cursor-pointer focus:ring-2 focus:ring-blue-600"
    >
      {Icon && (
        <div className="relative">
          {Badge && <Badge />}
          <Icon activatedColor={isActive ? activatedColor : undefined} />
        </div>
      )}
      <span
        className={classNames('text-gray-50 text-xs mt-2 font-semibold', isActive && `${activatedColor}-gradient-text`)}
      >
        {label}
      </span>
    </div>
  );
};
