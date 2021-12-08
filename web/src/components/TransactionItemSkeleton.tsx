export const TransactionItemSkeleton = () => (
  <div className="bg-gray-20 flex items-center gap-2 p-4 ">
    <div />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-60 bg-gray-40 animate-pulse" />
      <div className="h-3 w-32 bg-gray-40 animate-pulse" />
    </div>
  </div>
);
