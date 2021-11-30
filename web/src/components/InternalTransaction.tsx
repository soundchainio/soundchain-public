import { Matic } from 'icons/Matic';
import { PolygonscanResultObj } from 'lib/graphql';
import { currency } from 'utils/format';

interface InternalTransactionProps {
  transaction: Partial<PolygonscanResultObj>;
  maticUsdValue?: string;
}

export const InternalTransaction = ({ transaction, maticUsdValue }: InternalTransactionProps) => {
  return (
    <div className="flex items-center p-4 gap-2">
      <div className="min-w-0">
        <p className="text-white text-xs font-bold truncate">{transaction.hash}</p>
        <p className="text-gray-80 text-xxs font-medium">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="text-white text-sm font-bold flex items-center gap-1">
          {transaction.value && parseFloat(transaction.value) / 1e18}
          <Matic height="10" width="10" />
          <span className="text-gray-80 text-xxs font-bold uppercase"> Matic</span>
        </p>
        {maticUsdValue && transaction.value && (
          <p className="text-gray-50 text-xxs font-bold text-right">
            {`${currency((parseFloat(transaction.value) / 1e18) * parseFloat(maticUsdValue))} USD`}
          </p>
        )}
      </div>
    </div>
  );
};
