import classNames from 'classnames'
import { SVGGradientColor } from 'icons/gradients'
import { IconProps } from 'icons/types/IconProps'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

interface RefreshButtonProps {
  onClick?: () => void
  icon: (props: IconProps) => JSX.Element
  badge?: () => JSX.Element
  label: string
  className?: string
  path?: string
  color?: SVGGradientColor
}

export const TopNavBarButton = ({
  onClick,
  icon: Icon,
  badge: Badge,
  label,
  className,
  path,
  color,
}: RefreshButtonProps) => {
  const [isActive, setActive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (router.asPath === path) {
      setActive(true)
    } else {
      setActive(false)
    }
  }, [router.asPath, path])

  const baseClassName = 'flex flex-col gap-1 md:flex-row items-center md:h-6'

  if (path) {
    return (
      <Link href={path} passHref>
        <a className={classNames(baseClassName, className)}>
          <div className="relative mr-1">
            {Badge && <Badge />}
            <Icon color={isActive ? color : undefined} />
          </div>
          <span className={`${isActive && `${color}-gradient-text`} pt-1 text-xs font-semibold text-gray-60 md:pt-0`}>
            {label}
          </span>
        </a>
      </Link>
    )
  }

  return (
    <button type="button" className={classNames(baseClassName, className)} onClick={onClick}>
      <Icon />
      <span className="pt-1 text-xs font-semibold text-gray-60 md:pt-0">{label}</span>
    </button>
  )
}
