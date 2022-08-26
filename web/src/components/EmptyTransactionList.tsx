import { Activity } from 'icons/Activity'

export const EmptyTransactionList = () => {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center text-sm font-extrabold text-gray-80">
      <Activity width="40" height="40" />
      <p>No transaction history. Once you make your first transaction, it will appear here.</p>
    </div>
  )
}
