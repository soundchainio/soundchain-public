import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface RefreshButtonProps {
  onClick?: () => void;
  icon: (props: IconProps) => JSX.Element;
  label: string;
  className?: string;
  path?: string;
  color?: SVGGradientColor;
}

export const TopNavBarButton = ({ onClick, icon: Icon, label, className, path, color }: RefreshButtonProps) => {
  const [isActive, setActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.asPath === path) {
      setActive(true);
    } else {
      setActive(false);
    }
  }, [router.asPath, path]);

  if (path) {
    return (
      <Link href={path} passHref>
        <a className={classNames(className, 'flex flex-col items-center')}>
          <Icon color={isActive ? color : undefined} />
          <span className={`${isActive && `${color}-gradient-text`} pt-1 font-semibold text-gray-60 text-xs`}>
            {label}
          </span>
        </a>
      </Link>
    );
  }

  return (
    <button type="button" className={classNames(className, 'flex flex-col items-center')} onClick={onClick}>
      <Icon />
      <span className="text-gray-60 pt-1 font-semibold text-xs">{label}</span>
    </button>
  );
};
