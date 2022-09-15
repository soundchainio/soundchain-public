import { Badge } from 'components/Badge'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Genre, MeQuery, Profile } from 'lib/graphql'
import { getGenreLabelByKey } from 'utils/Genres'

interface TrackInfoProps {
  trackTitle?: string | null
  albumTitle?: string | null
  copyright?: string | null
  releaseYear?: number | null
  genres?: Genre[] | null
  mintingPending?: boolean
  artistProfile: Profile | undefined
  royalties?: number | null
  me?: MeQuery['me']
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
  me,
}: TrackInfoProps) => {
  return (
    <div className="w-full text-white">
      <div className="flex items-center px-4 py-3 text-xxs">
        <div className="mr-1 w-1/6 text-xs font-bold uppercase text-gray-CC">Artist</div>
        <div className="w-3/6">{artistProfile && <ProfileWithAvatar profile={artistProfile} />}</div>
        <div className="flex w-1/6 flex-col">
          <div className="text-center text-sm font-bold">{artistProfile?.followerCount}</div>
          <div className="text-center font-bold text-gray-CC">Followers</div>
        </div>
        <div className="flex w-1/6 flex-col">
          <div className="text-center text-sm font-bold">{artistProfile?.followingCount}</div>
          <div className="text-center font-bold text-gray-CC">Following</div>
        </div>
      </div>
      {me && (
        <div className="flex items-center font-bold">
          <div className="w-2/4 bg-gray-20 py-3 pl-4 text-xs uppercase text-gray-CC">Artist Royalty %</div>
          <div className="flex w-2/4 justify-center bg-gray-30 py-3 pr-4 pl-1 text-center text-xs">
            {royalties ? (
              `${royalties}%`
            ) : (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-white" />
            )}
          </div>
        </div>
      )}
      <div className="flex items-center font-bold">
        <div className="w-2/4 bg-gray-20 py-3 pl-4 text-xs uppercase text-gray-CC">Track Title</div>
        <div className="w-2/4 truncate bg-gray-30 py-3 pr-4 pl-1 text-center text-xs">{trackTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 bg-gray-30 py-3 pl-4 text-xs uppercase text-gray-CC">Album Title</div>
        <div className="w-2/4 truncate bg-gray-40 py-3 pr-4 pl-1 text-center text-xs">{albumTitle || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 bg-gray-20 py-3 pl-4 text-xs uppercase text-gray-CC">Release Year</div>
        <div className="w-2/4 truncate bg-gray-30 py-3 pr-4 pl-1 text-center text-xs">{releaseYear || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 bg-gray-30 py-3 pl-4 text-xs uppercase text-gray-CC">Copyright</div>
        <div className="w-2/4 truncate bg-gray-40 py-3 pr-4 pl-1 text-center text-xs">{copyright || '-'}</div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 py-3 pl-4 text-xs uppercase text-gray-CC">Genres</div>
        <div className="w-2/4 space-x-1 space-y-1 py-3 pr-4 pl-1 text-center text-xs">
          {genres?.map(genre => (
            <Badge key={genre} label={getGenreLabelByKey(genre) || genre} />
          ))}
        </div>
      </div>
      <div className="flex items-center font-bold">
        <div className="w-2/4 bg-gray-20 py-3 pl-4 text-xs uppercase text-gray-CC">Minting Status</div>
        <div className="w-2/4 bg-gray-30 py-3 pr-4 pl-1 text-center text-xs">
          {mintingPending ? (
            <div className="flex items-center justify-center gap-4">
              <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white" /> In progress...
            </div>
          ) : (
            'Done'
          )}
        </div>
      </div>
    </div>
  )
}
