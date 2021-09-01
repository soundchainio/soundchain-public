export const MessageSkeleton = () => (
  <div className="flex flex-row space-x-3 m-3 w-3/4">
    <div className="mt-8 rounded-full bg-gray-40 w-8 h-8 animate-pulse"></div>
    <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
      <div className="h-2 bg-gray-40 mb-2 animate-pulse"></div>
      <div className="h-2 bg-gray-40 mb-2 animate-pulse"></div>
      <div className="h-2 bg-gray-40 animate-pulse"></div>
    </div>
  </div>
);
