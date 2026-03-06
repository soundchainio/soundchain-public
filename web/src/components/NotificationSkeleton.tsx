export const NotificationSkeleton = () => (
  <div className="space-y-6 bg-gray-20 p-4">
    <div className="flex animate-pulse items-center space-x-6 ">
      <div className="h-8 w-8 rounded-full bg-gray-40"></div>
      <div className="h-4 w-20 bg-gray-40"></div>
    </div>
    <div className="h-3 animate-pulse bg-gray-40"></div>
    <div className="h-3 animate-pulse bg-gray-40"></div>
  </div>
)
