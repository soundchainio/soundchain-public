import classNames from 'classnames';
import { ProfileTabType } from 'types/ProfileTabType';

interface ProfileTabsProps {
  selectedTab: ProfileTabType
  setSelectedTab: (tab: ProfileTabType) => void
}

interface TabsListType {
  title: string
  type: ProfileTabType
  comingSoon: boolean
}

const tabs: TabsListType[] = [
  { title: 'Posts', type: ProfileTabType.POSTS, comingSoon: false },
  { title: 'Tracks', type: ProfileTabType.TRACKS, comingSoon: false },
  { title: 'Playlists', type: ProfileTabType.PLAYLISTS, comingSoon: true },
];

export const ProfileTabs = ({ selectedTab, setSelectedTab }: ProfileTabsProps) => {
  const onTabSelect = (tab: TabsListType) => {
    if (!tab.comingSoon) {
      setSelectedTab(tab.type);
    }
  };

  return (
    <div className="flex text-sm font-semibold text-center cursor-pointer">
      {tabs.map((tab, idx) =>
        <div key={idx} className="text-white flex-grow" onClick={() => onTabSelect(tab)}>
          <div className="px-2">
            {tab.title}  {tab.comingSoon && <span className="text-xs bg-gray-50 text-black py-0.5 px-1 rounded-full">Coming Soon</span>}
          </div>
          <div className={classNames(tab.type === selectedTab ? 'bg-gradient-to-r from-[#FF9191] to-[#CF6161]' : 'bg-gray-30', 'h-[2px] mt-1.5')}></div>
        </div>
      )
      }
    </div>
  );
};
