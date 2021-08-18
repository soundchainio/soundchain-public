export const ProfileTabs = () => {
  return (
    <div className="flex text-sm font-semibold text-center">
      <div className="text-white flex-grow">
        <div className="px-2">Posts</div>
        <div className="h-[2px] bg-gradient-to-r from-[#FF9191] to-[#CF6161] mt-1.5"></div>
      </div>
      <div className="text-gray-50 flex-grow">
        <div className="px-2">
          Tracks <span className="text-xs bg-gray-50 text-black py-0.5 px-1 rounded-full">Coming Soon</span>
        </div>
        <div className="h-[2px] bg-gray-30 mt-1.5"></div>
      </div>
      <div className="text-gray-50 flex-grow">
        <div className="px-2">
          Playlists <span className="text-xs bg-gray-50 text-black py-0.5 px-1 rounded-full">Coming Soon</span>
        </div>
        <div className="h-[2px] bg-gray-30 mt-1.5"></div>
      </div>
    </div>
  );
};
