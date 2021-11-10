import classNames from 'classnames';
import { ExploreTab } from 'types/ExploreTabType';

interface ExploreTabsProps {
  selectedTab: ExploreTab;
  setSelectedTab: (tab: ExploreTab) => void;
}

interface TabList {
  title: string;
  type: ExploreTab;
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
    <div className="flex text-sm font-semibold text-center border-b-2 border-gray-30">
      <div className="flex-1" />
      {tabs.map(tab => (
        <button key={tab.type} className=" text-white text-xs font-black px-4 h-10" onClick={() => onTabSelect(tab)}>
          <span
            className={classNames(
              'relative px-2 flex items-center justify-center after:h-0.5 after:w-full after:bg-gray-30 after:absolute after:-bottom-3.5 after:left-0',
              tab.type === selectedTab && 'after:bg-gradient-to-r from-[#FF9191] to-[#CF6161]',
            )}
          >
            {tab.title}
          </span>
        </button>
      ))}
      <div className="flex-1" />
    </div>
  );
};
