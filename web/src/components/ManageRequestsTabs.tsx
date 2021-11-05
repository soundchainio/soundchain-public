import classNames from 'classnames';
import { ManageRequestTab } from 'types/ManageRequestTabType';

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
];

export const ManageRequestTabs = ({ selectedTab, setSelectedTab }: ManageRequestTabsProps) => {
  const onTabSelect = (tab: TabList) => {
    setSelectedTab(tab.type);
  };

  return (
    <div className="flex text-sm font-semibold text-center cursor-pointer">
      {tabs.map((tab, idx) =>
        <div key={idx} className="text-white flex-grow" onClick={() => onTabSelect(tab)}>
          <div className="px-2 flex items-center justify-center md:py-4">
            {tab.title}
          </div>
          <div className={classNames(tab.type === selectedTab ? 'bg-gradient-to-r from-[#FF9191] to-[#CF6161]' : 'bg-gray-30', 'h-[2px] mt-1.5')}></div>
        </div>
      )}
    </div>
  );
};
