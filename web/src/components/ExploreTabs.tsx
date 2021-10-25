import classNames from 'classnames';
import { ExploreTab } from 'types/ExploreTabType';

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
];

export const ExploreTabs = ({ selectedTab, setSelectedTab }: ExploreTabsProps) => {
  const onTabSelect = (tab: TabList) => {
    setSelectedTab(tab.type);
  };

  return (
    <div className="flex text-sm font-semibold text-center cursor-pointer">
      {tabs.map((tab, idx) =>
        <div key={idx} className="text-white flex-grow" onClick={() => onTabSelect(tab)}>
          <div className="px-2 flex items-center justify-center">
            {tab.title}
          </div>
          <div className={classNames(tab.type === selectedTab ? 'bg-gradient-to-r from-[#FF9191] to-[#CF6161]' : 'bg-gray-30', 'h-[2px] mt-1.5')}></div>
        </div>
      )}
    </div>
  );
};
