import classNames from 'classnames'
import { HistoryTab } from 'types/HistoryTabType'

interface HistoryTabsProps {
  selectedTab: HistoryTab
  setSelectedTab: (tab: HistoryTab) => void
}

interface TabList {
  title: string
  type: HistoryTab
}

const tabs: TabList[] = [
  { title: 'TRANSACTIONS', type: HistoryTab.TRANSACTIONS },
  { title: 'INTERNAL', type: HistoryTab.INTERNAL },
]

export const HistoryTabs = ({ selectedTab, setSelectedTab }: HistoryTabsProps) => {
  const onTabSelect = (tab: TabList) => {
    setSelectedTab(tab.type)
  }

  return (
    <div className="flex border-b-2 border-gray-30 text-center text-sm font-semibold">
      <div className="flex-1" />
      {tabs.map(tab => (
        <button key={tab.type} className=" h-10 px-4 text-xs font-black text-white" onClick={() => onTabSelect(tab)}>
          <span
            className={classNames(
              'relative flex items-center justify-center px-2 after:absolute after:-bottom-3.5 after:left-0 after:h-0.5 after:w-full after:bg-gray-30',
              tab.type === selectedTab && 'from-[#FF9191] to-[#CF6161] after:bg-gradient-to-r',
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
