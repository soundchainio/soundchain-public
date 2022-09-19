import React from 'react'
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'

interface Props {
  setState: React.Dispatch<React.SetStateAction<boolean>>
  stateValue: boolean
  icon?: JSX.Element
  children: React.ReactNode
  title: string
}

export const Favoritebar = (props: Props) => {
  const { setState, stateValue, icon, children, title } = props

  return (
    <>
      <div
        onClick={() => setState(!stateValue)}
        className="relative flex h-12 w-full items-center justify-between space-x-2 border-t-2 border-gray-30 bg-gray-25 px-4 py-2 last:border-b-2 hover:cursor-pointer"
      >
        <span className="flex items-center">
          {icon && icon}
          <div className="font-bold text-gray-CC">{title}</div>
        </span>
        {stateValue ? <MdKeyboardArrowUp fill="white" size={30} /> : <MdKeyboardArrowDown fill="white" size={30} />}
      </div>

      {children}
    </>
  )
}
