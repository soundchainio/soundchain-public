import { Number } from 'components/Number';
import { Subtitle } from 'components/Subtitle';
import Image from 'next/image';

interface ArtistProps {
  artistId: string;
}

export const Artist = ({ artistId }: ArtistProps) => {
  return (
    <div className="flex items-center text-white p-4 w-full">
      <Subtitle size="sm" className="text-gray-80 flex-1"> ARTIST </Subtitle>
      <div className="flex items-center">
        <div className="overflow-hidden rounded-lg h-8 w-8 relative ml-4">
          <Image
            layout="fill"
            src="/_next/image?url=%2Fdefault-pictures%2Fprofile%2Fred.png&w=256&q=75"
          />
        </div>
        <div className="font-bold flex-1 px-4">
          The Beatles
        </div>
        <div className="text-center text-sm">
          <p className="font-semibold text-white">
            <Number value={500} />
          </p>
          <p className="text-gray-80 text-xs">Followers</p>
        </div>
        <div className="text-center text-sm ml-2">
          <p className="font-semibold text-white">
            <Number value={689} />
          </p>
          <p className="text-gray-80 text-xs">Following</p>
        </div>
      </div>
    </div>
  )
}