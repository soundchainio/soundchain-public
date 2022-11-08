import classNames from 'classnames'
import React from 'react'

type Flavor = 'blueberry' | 'raspberry' | 'lime' | 'greenapple' | 'grape' | 'dragonfruit'

interface Props extends React.ComponentPropsWithoutRef<'button'> {
  flavor: Flavor
  icon?: JSX.Element
}

const flavorGradients: Record<Flavor, string> = {
  blueberry: 'linear-gradient(90deg, #3b5bb1 0%, #6fa1ff 100%)',
  raspberry: 'linear-gradient(76.4deg, #ff9192 8.28%, #ff989e 83.02%)',
  lime: 'linear-gradient(76.4deg, #278E31 8.28%, #52B33B 83.02%)',
  greenapple: 'linear-gradient(76.4deg, #98DD9F 8.28%, #AFE2A3 83.02%)',
  grape: 'linear-gradient(76.4deg, #7A278E 8.28%, #AC6AFF 83.02%)',
  dragonfruit: 'linear-gradient(76.4deg, #AB4EFF 8.28%, #F1419E 83.02%)',
}

const commonClasses = `p-[2px] rounded-full h-auto`

export const JellyButton = ({ flavor, icon, className, children, ...props }: Props) => {
  const gradient = flavorGradients[flavor]
  return (
    <div className={classNames(commonClasses, className)} style={{ background: gradient }}>
      <button className="flex h-auto w-full items-center space-x-1 rounded-full bg-gray-10 p-1 font-black" {...props}>
        <span>{icon}</span>
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradient }}>
          {children}
        </span>
      </button>
    </div>
  )
}
