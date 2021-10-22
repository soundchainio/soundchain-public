interface TrackInfoProps {
  trackTitle?: string | null;
  albumTitle?: string | null;
  releaseYear?: number | null;
}

export const TrackInfo = ({ trackTitle, albumTitle, releaseYear }: TrackInfoProps) => {
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
        <div className="w-2/4 uppercase text-sm pl-4 py-3">Genres</div>
        <div className="text-center w-2/4 text-sm pr-4 py-3">
          -
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
