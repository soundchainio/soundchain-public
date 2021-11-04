import { List } from 'icons/List';
import { RightArrow } from 'icons/RightArrow';
import Link from 'next/link';

export const ExploreTopTracksBanner = () => {
  return (
    <Link href="/top-tracks">
      <a className="bg-yellow-red-gradient rounded-lg flex text-white px-4 py-6 gap-1 items-center">
        <div className="flex flex-col flex-1">
          <p className="text-shadow text-2xl font-black uppercase">Top 100</p>
          <p className="font-medium text-xs leading-3">Top 100 tracks on the SoundChain platform by stream count.</p>
        </div>
        <div className="flex-1 flex justify-center">
          <List />
        </div>
        <RightArrow fillColor="white" />
      </a>
    </Link>
  );
};
