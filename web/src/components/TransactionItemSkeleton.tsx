export const TransactionItemSkeleton = () => (
  <div className="flex items-center gap-2 bg-gray-20 p-4 ">
    <div />
    <div className="flex flex-col gap-1">
      <div className="h-3 w-60 animate-pulse bg-gray-40" />
      <div className="h-3 w-32 animate-pulse bg-gray-40" />
    </div>
  </div>
)
