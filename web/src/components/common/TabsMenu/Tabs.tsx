/* eslint-disable @typescript-eslint/no-explicit-any */
import classNames from 'classnames'

interface Props {
  selectedTab: any
  setSelectedTab: (tab: any) => void
  tabList: string[]
}

export const Tabs = (props: Props) => {
  const { tabList, selectedTab, setSelectedTab } = props

  const onTabSelect = (tab: string) => {
    setSelectedTab(tab)
  }

  return (
    <div className="flex text-center text-sm font-semibold">
      <div className="flex-1" />
      {tabList.map(tab => (
        <button key={tab} className=" h-10 px-4 text-xs font-black text-white" onClick={() => onTabSelect(tab)}>
          <span
            className={classNames(
              'relative flex items-center justify-center px-2 after:absolute after:-bottom-3.5 after:left-0 after:h-0.5 after:w-full after:bg-gray-30',
              tab === selectedTab && 'from-[#FED603] to-[#FE5540] after:bg-gradient-to-r',
            )}
          >
            {tab}
          </span>
        </button>
      ))}
      <div className="flex-1" />
    </div>
  )
}
