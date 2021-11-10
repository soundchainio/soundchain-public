import { IconProps } from 'icons/types/IconProps';
import Link from 'next/link';

interface MenuLinkProps {
  icon?: (props: IconProps) => JSX.Element;
  label: string;
  href: string;
}

export const MenuLink = ({ icon: Icon, label, href }: MenuLinkProps) => {
  return (
    <Link href={href} passHref>
      <a className="flex-shrink-0 flex bg-gray-25 p-4 border-t-2 last:border-b-2 border-gray-30 items-center space-x-2 h-16">
        {Icon && <Icon fill="gray" />}
        <div className="text-gray-CC font-bold">{label}</div>
      </a>
    </Link>
  );
};
