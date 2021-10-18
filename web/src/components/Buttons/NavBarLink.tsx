import classNames from 'classnames';
import { SVGGradientColor } from 'icons/gradients';
import { IconProps } from 'icons/types/IconProps';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

interface NavBarLinkProps {
  badge?: () => JSX.Element;
  label: string;
  path: string;
  onClick?: () => void;
  icon?: (props: IconProps) => JSX.Element;
  color?: SVGGradientColor;
  id?: string;
}

export const NavBarLink = ({ label, path, icon: Icon, badge: Badge, color, id }: NavBarLinkProps) => {
  const { asPath } = useRouter();

  const isActive = asPath === path;

  return (
    <Link href={path} passHref>
      <a className="flex flex-col flex-1 items-center justify-center align-middle cursor-pointer focus:ring-2 focus:ring-blue-600">
        {Icon && (
          <div className="relative">
            {Badge && <Badge />}
            <Icon color={isActive ? color : undefined} id={id} />
          </div>
        )}
        <span
          className={classNames(
            'text-gray-50 text-xs mt-2 font-semibold',
            isActive && `${color}-gradient-text`,
          )}
        >
          {label}
        </span>
      </a>
    </Link>
  );
};
