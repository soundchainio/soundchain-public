export const CommentSkeleton = () => (
  <div className="flex flex-row space-x-3">
    <div className="mt-4 rounded-full bg-gray-40 w-8 h-8"></div>
    <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <div className="w-20 h-3 bg-gray-40"></div>
        <div className="w-12 h-3 bg-gray-40"></div>
      </div>
      <div className="h-2 bg-gray-40 mb-2"></div>
      <div className="h-2 bg-gray-40"></div>
    </div>
  </div>
);
