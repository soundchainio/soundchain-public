import { BadgeGeneral } from 'components/common/Badges/BadgeGeneral'
import { IconProps } from 'icons/types/IconProps'
import Link from 'next/link'

interface MenuLinkProps {
  icon?: (props: IconProps) => JSX.Element
  label: string
  href: string
  target?: string
  rel?: string
  badgeNumber?: number
}

export const MenuLink = ({ icon: Icon, label, href, badgeNumber, target, rel }: MenuLinkProps) => {
  return (
    <Link
      href={href}
      passHref
      rel={rel}
      target={target}
      className="relative flex h-12 w-full flex-shrink-0 items-center space-x-2 border-t-2 border-gray-30 bg-gray-25 px-4 py-2 last:border-b-2"
    >
      {Icon && <Icon fill="gray" />}
      <BadgeGeneral number={badgeNumber} />
      <div className="font-bold text-gray-CC">{label}</div>
    </Link>
  )
}
