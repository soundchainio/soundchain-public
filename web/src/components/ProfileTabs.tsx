import classNames from 'classnames'
import { Music as MusicIcon } from 'icons/Music'
import { Playlists as PlaylistsIcon } from 'icons/Playlists'
import { Posts as PostsIcon } from 'icons/Posts'
import { ProfileTab } from 'types/ProfileTabType'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  fillColor?: string
}

interface ProfileTabsProps {
  selectedTab: ProfileTab
  setSelectedTab: (tab: ProfileTab) => void
}

interface TabList {
  title: string
  type: ProfileTab
  comingSoon: boolean
  icon: (props: IconProps) => JSX.Element
}

const tabs: TabList[] = [
  { title: 'Posts', type: ProfileTab.POSTS, comingSoon: false, icon: PostsIcon },
  { title: 'Music', type: ProfileTab.TRACKS, comingSoon: false, icon: MusicIcon },
  { title: 'Playlists', type: ProfileTab.PLAYLISTS, comingSoon: true, icon: PlaylistsIcon },
]

export const ProfileTabs = ({ selectedTab, setSelectedTab }: ProfileTabsProps) => {
  const onTabSelect = (tab: TabList) => {
    if (!tab.comingSoon) {
      setSelectedTab(tab.type)
    }
  }

  return (
    <div className="flex cursor-pointer text-center text-sm font-semibold">
      {tabs.map((tab, idx) => (
        <div key={idx} className="flex-grow text-white" onClick={() => onTabSelect(tab)}>
          <div className="flex items-center justify-center px-2">
            <tab.icon fillColor={selectedTab === tab.type ? 'white' : '#505050'} className="mr-2" />
            {tab.title}
            {tab.comingSoon && (
              <span className="ml-1 rounded-full bg-gray-50 py-0.5 px-1 text-xs text-black">Coming soon</span>
            )}
          </div>
          <div
            className={classNames(
              tab.type === selectedTab ? 'bg-gradient-to-r from-[#FF9191] to-[#CF6161]' : 'bg-gray-30',
              'mt-1.5 h-[2px]',
            )}
          ></div>
        </div>
      ))}
    </div>
  )
}
