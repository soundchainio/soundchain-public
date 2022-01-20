import { Matic } from 'icons/Matic';
import { network } from 'lib/blockchainNetworks';
import { PolygonscanResultObj } from 'lib/graphql';
import { currency, priceToShow } from 'utils/format';

interface InternalTransactionProps {
  transaction: Partial<PolygonscanResultObj>;
  maticUsdValue?: string;
}

export const InternalTransaction = ({ transaction, maticUsdValue }: InternalTransactionProps) => {
  return (
    <a
      href={`${network.blockExplorer}/tx/${transaction.hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center p-4 gap-2"
    >
      <div className="min-w-0">
        <p className="text-white text-xs font-bold truncate">{transaction.hash}</p>
        <p className="text-gray-80 text-xxs font-medium">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="text-white text-sm font-bold flex items-center gap-1">
          {transaction.value && priceToShow(transaction.value)}
          <Matic height="10" width="10" />
          <span className="text-gray-80 text-xxs font-bold uppercase"> Matic</span>
        </p>
        {maticUsdValue && transaction.value && (
          <p className="text-gray-50 text-xxs font-bold text-right">
            {`${currency(priceToShow(transaction.value) * parseFloat(maticUsdValue))} USD`}
          </p>
        )}
      </div>
    </a>
  );
};
