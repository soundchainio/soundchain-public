export const MessageSkeleton = () => (
  <div className="m-3 flex w-3/4 flex-row space-x-3">
    <div className="mt-8 h-8 w-8 animate-pulse rounded-full bg-gray-40"></div>
    <div className="flex-1 rounded-xl bg-gray-20 py-4 px-4">
      <div className="mb-2 h-2 animate-pulse bg-gray-40"></div>
      <div className="mb-2 h-2 animate-pulse bg-gray-40"></div>
      <div className="h-2 animate-pulse bg-gray-40"></div>
    </div>
  </div>
)
