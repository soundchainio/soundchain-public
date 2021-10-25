import { Badge } from 'components/Badge';
import { Genre } from 'lib/graphql';
import { getGenreLabelByKey } from 'utils/Genres';

interface TrackInfoProps {
  trackTitle?: string | null;
  albumTitle?: string | null;
  copyright?: string | null;
  releaseYear?: number | null;
  genres?: Genre[] | null;
}

export const TrackInfo = ({ trackTitle, albumTitle, releaseYear, genres, copyright }: TrackInfoProps) => {
  return (
    <div className="w-full text-white">
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-sm pl-4 py-3 bg-gray-20">Track Title</div>
        <div className="text-center w-2/4 text-sm bg-gray-30 pr-4 py-3">{trackTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-sm pl-4 py-3 bg-gray-30">Album Title</div>
        <div className="text-center w-2/4 text-sm bg-gray-40 pr-4 py-3">{albumTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-sm pl-4 py-3 bg-gray-20">Release Year</div>
        <div className="text-center w-2/4 text-sm bg-gray-30 pr-4 py-3">{releaseYear || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-sm pl-4 py-3 bg-gray-30">Copyright</div>
        <div className="text-center w-2/4 text-sm bg-gray-40 pr-4 py-3">{copyright || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-sm pl-4 py-3">Genres</div>
        <div className="text-center w-2/4 text-sm pr-4 py-3">
          {genres?.map(genre => (
            <Badge key={genre} label={getGenreLabelByKey(genre) || genre} />
          ))}
          {/* <Badge
            label={"Electronic"}
            selected={false}
            onClick={() => false}
          /> */}
        </div>
      </div>
    </div>
  );
};
