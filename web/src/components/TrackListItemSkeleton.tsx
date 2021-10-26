export const TrackListItemSkeleton = () => (
  <div className="bg-gray-20 flex items-center gap-2 px-4 py-2">
    <div />
    <div className="h-10 w-10 relative flex items-center bg-gray-40 animate-pulse" />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-60 bg-gray-40 animate-pulse" />
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 bg-gray-40 animate-pulse" />
        <div className="h-3 w-32 bg-gray-40 animate-pulse" />
      </div>
    </div>
  </div>
);
