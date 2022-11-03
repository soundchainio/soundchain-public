import classNames from 'classnames'
import { SVGGradientColor } from 'icons/gradients'
import { IconProps } from 'icons/types/IconProps'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

interface NavBarButtonProps {
  badge?: () => JSX.Element
  label: string
  path?: string
  onClick?: () => void
  icon?: (props: IconProps) => JSX.Element
  color?: SVGGradientColor
  id?: string
  nyanCat?: boolean
  className?: string
  alwaysShowLabel?: boolean
  showUnreadLabel?: boolean
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
  className,
  alwaysShowLabel
}: NavBarButtonProps) => {
  const [isActive, setActive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (router.asPath === path) {
      setActive(true)
    } else {
      setActive(false)
    }
  }, [router.asPath, path])

  const onButtonClick = () => {
    setActive(true)
    if (onClick) {
      onClick()
    }
  }

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
          <div className="flex scale-150 overflow-hidden">
            <Image height={20} width={40} src="/nyan-cat-cropped.gif" alt="Loading" priority />
          </div>
        )}
        <span
          className={classNames(
            !path ? 'text-white' : 'text-gray-80',
            'text-xs font-black',
            isActive && color && `${color}-gradient-text text-transparent`,
            isActive || alwaysShowLabel ? `inline` : 'hidden',
          )}
        >
          {label}
        </span>
      </>
    )
  }
  const baseClassName = classNames(
    `flex flex-col md:flex-row flex-1 md:flex-none items-center justify-center align-middle cursor-pointer`,
    nyanCat ? 'gap-3' : 'gap-2',
    className,
  )

  if (path) {
    return (
      <Link href={path} passHref>
        <a className={baseClassName}>
          <MenuContentItem />
        </a>
      </Link>
    )
  }

  return (
    <button onClick={onButtonClick} className={baseClassName}>
      <MenuContentItem />
    </button>
  )
}
