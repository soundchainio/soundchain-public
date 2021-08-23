export const NotificationSkeleton = () => (
  <div className="p-4 bg-gray-20 space-y-6">
    <div className="flex items-center space-x-6 animate-pulse ">
      <div className="rounded-full bg-gray-40 w-8 h-8"></div>
      <div className="w-20 h-4 bg-gray-40"></div>
    </div>
    <div className="h-3 bg-gray-40 animate-pulse"></div>
    <div className="h-3 bg-gray-40 animate-pulse"></div>
  </div>
);
