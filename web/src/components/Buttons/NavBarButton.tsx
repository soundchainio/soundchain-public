import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import Image from 'next/image';
import Link from 'next/link';
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
  nyanCat?: boolean;
}

export const NavBarButton = ({
  label,
  path,
  icon: Icon,
  onClick,
  badge: Badge,
  color,
  id,
  nyanCat,
}: NavBarButtonProps) => {
  const [isActive, setActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.asPath === path) {
      setActive(true);
    } else {
      setActive(false);
    }
  }, [router.asPath, path]);

  const onButtonClick = () => {
    setActive(true);
    if (onClick) {
      onClick();
    }
  };

  const MenuContentItem = () => {
    return (
      <>
        {Icon && (
          <div className="relative">
            {Badge && <Badge />}
            <Icon color={isActive ? color : undefined} id={id} />
          </div>
        )}
        {nyanCat && (
          <div className="relative overflow-hidden scale-150">
            <Image height={20} width={40} src="/nyan-cat-cropped.gif" alt="Loading" priority />
          </div>
        )}
        <span
          className={classNames(
            'text-gray-50 text-xs font-semibold',
            !nyanCat && 'mt-2',
            isActive && `${color}-gradient-text`,
          )}
        >
          {label}
        </span>
      </>
    );
  };
  const className =
    'flex flex-col flex-1 md:flex-none items-center justify-center align-middle cursor-pointer focus:ring-2 focus:ring-blue-600';

  if (path) {
    return (
      <Link href={path} passHref>
        <a className={className}>
          <MenuContentItem />
        </a>
      </Link>
    );
  }

  return (
    <button onClick={onButtonClick} className={className}>
      <MenuContentItem />
    </button>
  );
};
