import { Badge } from 'components/Badge';
import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { Genre, Profile } from 'lib/graphql';
import { getGenreLabelByKey } from 'utils/Genres';

interface TrackInfoProps {
  trackTitle?: string | null;
  albumTitle?: string | null;
  copyright?: string | null;
  releaseYear?: number | null;
  genres?: Genre[] | null;
  mintingPending?: boolean;
  artistProfile: Profile | undefined;
  royalties?: number;
}

export const TrackInfo = ({
  trackTitle,
  albumTitle,
  releaseYear,
  genres,
  copyright,
  mintingPending,
  artistProfile,
  royalties,
}: TrackInfoProps) => {
  return (
    <div className="w-full text-white">
      <div className="flex items-center text-xxs px-4 py-3">
        <div className="w-1/6 uppercase text-xs text-gray-CC font-bold mr-1">Artist</div>
        <div className="w-3/6">{artistProfile && <ProfileWithAvatar profile={artistProfile} />}</div>
        <div className="flex flex-col w-1/6">
          <div className="text-center text-sm font-bold">{artistProfile?.followerCount}</div>
          <div className="text-center text-gray-CC font-bold">Followers</div>
        </div>
        <div className="flex flex-col w-1/6">
          <div className="text-center text-sm font-bold">{artistProfile?.followingCount}</div>
          <div className="text-center text-gray-CC font-bold">Following</div>
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-20">Artist Royalty %</div>
        <div className="flex justify-center text-center w-2/4 text-xs bg-gray-30 pr-4 py-3">
          {royalties === undefined ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
          ) : (
            `${royalties}%`
          )}
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-20">Track Title</div>
        <div className="text-center w-2/4 text-xs bg-gray-30 pr-4 py-3 truncate">{trackTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-30">Album Title</div>
        <div className="text-center w-2/4 text-xs bg-gray-40 pr-4 py-3 truncate">{albumTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-20">Release Year</div>
        <div className="text-center w-2/4 text-xs bg-gray-30 pr-4 py-3 truncate">{releaseYear || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-30">Copyright</div>
        <div className="text-center w-2/4 text-xs bg-gray-40 pr-4 py-3 truncate">{copyright || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3">Genres</div>
        <div className="text-center w-2/4 text-xs pr-4 py-3 space-x-1 space-y-1">
          {genres?.map(genre => (
            <Badge key={genre} label={getGenreLabelByKey(genre) || genre} />
          ))}
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 uppercase text-xs text-gray-CC pl-4 py-3 bg-gray-20">Minting Status</div>
        <div className="text-center w-2/4 text-xs bg-gray-30 pr-4 py-3">
          {mintingPending ? (
            <div className="flex justify-center items-center gap-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" /> In progress...
            </div>
          ) : (
            'Done'
          )}
        </div>
      </div>
    </div>
  );
};
