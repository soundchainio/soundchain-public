export const GridSkeleton = () => (
  <div className="m-2 h-60 space-y-6 bg-gray-20 p-8">
    <div className="flex animate-pulse items-center justify-center space-x-6">
      <div className=" h-16 w-16 bg-gray-40"></div>
    </div>
    <div className="h-3 animate-pulse bg-gray-40"></div>
    <div className="h-3 animate-pulse bg-gray-40"></div>
    <div className="flex animate-pulse space-x-3">
      <div className="h-3 w-20 bg-gray-40"></div>
      <div className="h-3 w-20 bg-gray-40"></div>
      <div className="h-3 w-20 bg-gray-40"></div>
    </div>
  </div>
)
