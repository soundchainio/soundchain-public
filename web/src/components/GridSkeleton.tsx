export const GridSkeleton = () => (
  <div className="bg-gray-900/50 rounded-2xl overflow-hidden">
    {/* Image Skeleton */}
    <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse" />

    {/* Content Skeleton */}
    <div className="p-3 space-y-3">
      {/* Title */}
      <div className="h-4 bg-gray-700 rounded-full animate-pulse w-3/4" />
      {/* Subtitle */}
      <div className="h-3 bg-gray-700/50 rounded-full animate-pulse w-1/2" />
      {/* Price Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-16" />
          <div className="h-2 bg-gray-700/50 rounded animate-pulse w-12" />
        </div>
        <div className="h-8 w-14 bg-gray-700 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
)

// Compact skeleton for smaller grids
export const GridSkeletonCompact = () => (
  <div className="bg-gray-900/50 rounded-xl overflow-hidden">
    <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-700 animate-pulse" />
    <div className="p-2 space-y-2">
      <div className="h-3 bg-gray-700 rounded-full animate-pulse w-3/4" />
      <div className="h-2 bg-gray-700/50 rounded-full animate-pulse w-1/2" />
    </div>
  </div>
)
