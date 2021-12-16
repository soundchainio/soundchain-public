import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Label } from './Label';

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
        <a
          className={classNames(
            className,
            'flex flex-col items-center cursor-pointer focus:ring-2 focus:ring-blue-600',
          )}
        >
          <Icon color={isActive ? color : undefined} />
          <Label textSize="xs" className={classNames(isActive && `${color}-gradient-text`, 'pt-1 font-semibold')}>
            {label}
          </Label>
        </a>
      </Link>
    );
  }

  return (
    <button
      className={classNames(className, 'flex flex-col items-center cursor-pointer focus:ring-2 focus:ring-blue-600')}
      onClick={onClick}
    >
      <Icon />
      <Label textSize="xs" className="pt-1 font-semibold">
        {label}
      </Label>
    </button>
  );
};
