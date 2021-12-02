import { Activity } from 'icons/Activity';

export const EmptyTransactionList = () => {
  return (
    <div className="flex flex-col items-center text-gray-80 font-extrabold text-sm text-center gap-6 py-16">
      <Activity width="40" height="40" />{' '}
      <p>No transaction history. Once you make your first transaction, it will appear here.</p>
    </div>
  );
};
