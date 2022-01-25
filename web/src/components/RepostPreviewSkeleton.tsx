import { RefreshIcon } from '@heroicons/react/solid';

export const RepostPreviewSkeleton = () => (
  <div className=" bg-gray-20 my-4">
    <div className="flex items-center font-bold bg-gray-20 text-gray-400 text-sm">
      <RefreshIcon className="h-4 w-4 mr-1" /> Repost
    </div>
    <div className="space-y-6 p-4 bg-gray-30 rounded-lg mb-2">
      <div className="flex items-center space-x-6 animate-pulse ">
        <div className="rounded-full bg-gray-40 w-8 h-8"></div>
        <div className="w-20 h-4 bg-gray-40"></div>
      </div>
      <div className="h-3 bg-gray-40 animate-pulse"></div>
      <div className="flex space-x-3 animate-pulse">
        <div className="h-3 bg-gray-40 w-20"></div>
        <div className="h-3 bg-gray-40 w-20"></div>
        <div className="h-3 bg-gray-40 w-20"></div>
      </div>
    </div>
  </div>
);
