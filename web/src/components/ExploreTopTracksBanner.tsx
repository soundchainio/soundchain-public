import { List } from 'icons/List'
import { RightArrow } from 'icons/RightArrow'
import Link from 'next/link'

export const ExploreTopTracksBanner = () => {
  return (
    <Link
      href="/top-tracks"
      className="bg-yellow-red-gradient flex items-center gap-1 rounded-lg px-4 py-6 text-white"
      passHref
    >
      <div className="flex flex-1 flex-col">
        <p className="text-shadow text-2xl font-black uppercase">Top 100</p>
        <p className="text-xs font-medium leading-3">Top 100 tracks on the SoundChain platform by stream count.</p>
      </div>
      <div className="flex flex-1 justify-center">
        <List />
      </div>
      <RightArrow stroke="white" />
    </Link>
  )
}
