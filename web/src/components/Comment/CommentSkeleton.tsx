export const CommentSkeleton = () => (
  <div className="flex flex-row space-x-3">
    <div className="mt-4 h-8 w-8 rounded-full bg-gray-40"></div>
    <div className="flex-1 rounded-xl bg-gray-20 py-4 px-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-3 w-20 bg-gray-40"></div>
        <div className="h-3 w-12 bg-gray-40"></div>
      </div>
      <div className="mb-2 h-2 bg-gray-40"></div>
      <div className="h-2 bg-gray-40"></div>
    </div>
  </div>
)
