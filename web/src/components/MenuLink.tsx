import { BadgeGeneral } from 'components/BadgeGeneral';
import { IconProps } from 'icons/types/IconProps';
import Link from 'next/link';

interface MenuLinkProps {
  icon?: (props: IconProps) => JSX.Element;
  label: string;
  href: string;
  badgeNumber?: number;
}

export const MenuLink = ({ icon: Icon, label, href, badgeNumber }: MenuLinkProps) => {
  return (
    <Link href={href} passHref>
      <a className="flex-shrink-0 flex bg-gray-25 px-4 py-2 border-t-2 last:border-b-2 border-gray-30 items-center space-x-2 h-12 w-full relative">
        {Icon && <Icon fill="gray" />}
        <BadgeGeneral number={badgeNumber} />
        <div className="text-gray-CC font-bold">{label}</div>
      </a>
    </Link>
  );
};
