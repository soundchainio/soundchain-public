import classNames from 'classnames'
import { ExploreTab } from 'types/ExploreTabType'

interface ExploreTabsProps {
  selectedTab: ExploreTab
  setSelectedTab: (tab: ExploreTab) => void
}

interface TabList {
  title: string
  type: ExploreTab
}

const tabs: TabList[] = [
  { title: 'ALL', type: ExploreTab.ALL },
  { title: 'USERS', type: ExploreTab.USERS },
  { title: 'TRACKS', type: ExploreTab.TRACKS },
]

export const ExploreTabs = ({ selectedTab, setSelectedTab }: ExploreTabsProps) => {
  const onTabSelect = (tab: TabList) => {
    setSelectedTab(tab.type)
  }

  return (
    <div className="flex text-center text-sm font-semibold">
      <div className="flex-1" />
      {tabs.map(tab => (
        <button key={tab.type} className=" h-10 px-4 text-xs font-black text-white" onClick={() => onTabSelect(tab)}>
          <span
            className={classNames(
              'relative flex items-center justify-center px-2 after:absolute after:-bottom-3.5 after:left-0 after:h-0.5 after:w-full after:bg-gray-30',
              tab.type === selectedTab && 'from-[#FED603] to-[#FE5540] after:bg-gradient-to-r',
            )}
          >
            {tab.title}
          </span>
        </button>
      ))}
      <div className="flex-1" />
    </div>
  )
}
