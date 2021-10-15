import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface NavBarButtonProps {
  badge?: () => JSX.Element;
  label: string;
  path?: string;
  onClick?: () => void;
  icon?: (props: IconProps) => JSX.Element;
  color?: SVGGradientColor;
  id?: string;
}

export const NavBarButton = ({ label, path, icon: Icon, onClick, badge: Badge, color, id }: NavBarButtonProps) => {
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
    <button
      onClick={onButtonClick}
      className="flex flex-col flex-1 items-center justify-center align-middle cursor-pointer focus:ring-2 focus:ring-blue-600"
    >
      {Icon && (
        <div className="relative">
          {Badge && <Badge />}
          <Icon color={isActive ? color : undefined} id={id} />
        </div>
      )}
      <span className={classNames('text-gray-50 text-xs mt-2 font-semibold', isActive && `${color}-gradient-text`)}>
        {label}
      </span>
    </button>
  );
};
