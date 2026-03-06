/* eslint-disable jsx-a11y/alt-text */
import { Number } from 'components/Number'
import { Subtitle } from 'components/Subtitle'
import Image from 'next/image'

interface ArtistProps {
  artistId: string
}

export const Artist = ({ artistId }: ArtistProps) => {
  return (
    <div className="flex w-full items-center p-4 text-white">
      <Subtitle size="sm" className="flex-1 text-gray-80">
        ARTIST
      </Subtitle>
      <div className="flex items-center">
        <div className="relative ml-4 h-8 w-8 overflow-hidden rounded-lg">
          <Image fill alt="artist image" src="/_next/image?url=%2Fdefault-pictures%2Fprofile%2Fred.png&w=256&q=75" />
        </div>
        <div className="flex-1 px-4 font-bold">The Beatles - {artistId}</div>
        <div className="text-center text-sm">
          <p className="font-semibold text-white">
            <Number value={500} />
          </p>
          <p className="text-xs text-gray-80">Followers</p>
        </div>
        <div className="ml-2 text-center text-sm">
          <p className="font-semibold text-white">
            <Number value={689} />
          </p>
          <p className="text-xs text-gray-80">Following</p>
        </div>
      </div>
    </div>
  )
}
