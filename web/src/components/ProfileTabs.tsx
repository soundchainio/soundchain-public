import classNames from 'classnames';
import { Music as MusicIcon } from 'icons/Music';
import { Playlists as PlaylistsIcon } from 'icons/Playlists';
import { Posts as PostsIcon } from 'icons/Posts';
import { IconProps } from 'icons/types/IconProps';
import { ProfileTabType } from 'types/ProfileTabType';

interface ProfileTabsProps {
  selectedTab: ProfileTabType
  setSelectedTab: (tab: ProfileTabType) => void
}

interface TabsListType {
  title: string
  type: ProfileTabType
  comingSoon: boolean
  icon: (props: IconProps) => JSX.Element;
}

const tabs: TabsListType[] = [
  { title: 'Posts', type: ProfileTabType.POSTS, comingSoon: false, icon: PostsIcon },
  { title: 'Music', type: ProfileTabType.TRACKS, comingSoon: false, icon: MusicIcon },
  { title: 'Playlists', type: ProfileTabType.PLAYLISTS, comingSoon: true, icon: PlaylistsIcon },
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
          <div className="px-2 flex items-center justify-center">
            <tab.icon activatedColor={selectedTab === tab.type ? 'white' : undefined} className="mr-2" /> {tab.title}  {tab.comingSoon && <span className="text-xs bg-gray-50 text-black py-0.5 px-1 rounded-full">Coming Soon</span>}
          </div>
          <div className={classNames(tab.type === selectedTab ? 'bg-gradient-to-r from-[#FF9191] to-[#CF6161]' : 'bg-gray-30', 'h-[2px] mt-1.5')}></div>
        </div>
      )}
    </div>
  );
};
