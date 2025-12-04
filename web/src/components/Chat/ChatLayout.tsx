import { ReactNode } from 'react'
import { TopNavBar, TopNavBarProps } from 'components/TopNavBar'

interface LayoutMenuProps {
  children: ReactNode
  topNavBarProps?: TopNavBarProps
}

export const ChatLayout = ({ children, topNavBarProps }: LayoutMenuProps) => {
  return (
    <div className="flex h-full">
      <div className="flex w-0 flex-1 flex-col ">
        <div className="fixed top-0 z-10 w-full">
          <TopNavBar {...topNavBarProps} />
        </div>
        <main className="relative flex-1 bg-gray-10 focus:outline-none">
          <div id="main" className="mx-auto max-w-7xl pt-8 pb-14">
            {children}
          </div>
        </main>
        <div className="fixed bottom-0 w-full">
          <div id="bottom-sheet"></div>
        </div>
      </div>
    </div>
  )
}
