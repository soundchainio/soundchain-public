export const GridSkeleton = () => (
  <div className="p-8 m-2 bg-gray-20 space-y-6 h-60">
    <div className="flex items-center space-x-6 animate-pulse justify-center">
      <div className=" bg-gray-40 w-16 h-16"></div>
    </div>
    <div className="h-3 bg-gray-40 animate-pulse"></div>
    <div className="h-3 bg-gray-40 animate-pulse"></div>
    <div className="flex space-x-3 animate-pulse">
      <div className="h-3 bg-gray-40 w-20"></div>
      <div className="h-3 bg-gray-40 w-20"></div>
      <div className="h-3 bg-gray-40 w-20"></div>
    </div>
  </div>
);
