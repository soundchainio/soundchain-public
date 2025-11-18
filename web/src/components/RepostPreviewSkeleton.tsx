import { RefreshIcon } from '@heroicons/react/24/outline'

export const RepostPreviewSkeleton = () => (
  <div className=" my-4 bg-gray-20">
    <div className="flex items-center bg-gray-20 text-sm font-bold text-gray-400">
      <RefreshIcon className="mr-1 h-4 w-4" /> Repost
    </div>
    <div className="mb-2 space-y-6 rounded-lg bg-gray-30 p-4">
      <div className="flex animate-pulse items-center space-x-6 ">
        <div className="h-8 w-8 rounded-full bg-gray-40"></div>
        <div className="h-4 w-20 bg-gray-40"></div>
      </div>
      <div className="h-3 animate-pulse bg-gray-40"></div>
      <div className="flex animate-pulse space-x-3">
        <div className="h-3 w-20 bg-gray-40"></div>
        <div className="h-3 w-20 bg-gray-40"></div>
        <div className="h-3 w-20 bg-gray-40"></div>
      </div>
    </div>
  </div>
)
