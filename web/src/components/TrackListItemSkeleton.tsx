export const TrackListItemSkeleton = () => (
  <div className="flex items-center gap-2 bg-gray-20 px-4 py-2">
    <div />
    <div className="relative flex h-10 w-10 animate-pulse items-center bg-gray-40" />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-60 animate-pulse bg-gray-40" />
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 animate-pulse bg-gray-40" />
        <div className="h-3 w-32 animate-pulse bg-gray-40" />
      </div>
    </div>
  </div>
)
