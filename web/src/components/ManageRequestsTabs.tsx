import classNames from 'classnames'
import { ManageRequestTab } from 'types/ManageRequestTabType'

interface ManageRequestTabsProps {
  selectedTab: ManageRequestTab
  setSelectedTab: (tab: ManageRequestTab) => void
}

interface TabList {
  title: string
  type: ManageRequestTab
}

const tabs: TabList[] = [
  { title: 'PENDING', type: ManageRequestTab.PENDING },
  { title: 'APPROVED', type: ManageRequestTab.APPROVED },
  { title: 'DENIED', type: ManageRequestTab.DENIED },
]

export const ManageRequestTabs = ({ selectedTab, setSelectedTab }: ManageRequestTabsProps) => {
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
