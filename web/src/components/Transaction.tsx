import { ExclamationCircleIcon } from '@heroicons/react/solid';
import { Matic } from 'icons/Matic';
import { network } from 'lib/blockchainNetworks';
import { PolygonscanResultObj } from 'lib/graphql';
import { transactionDataMap } from 'types/TransactionType';
import { currency } from 'utils/format';

interface TransactionProps {
  transaction: PolygonscanResultObj;
  maticUsdValue?: string;
}

const ErrorIcon = () => {
  return <ExclamationCircleIcon width={20} height={20} color="red" />;
};

export const Transaction = ({ transaction, maticUsdValue }: TransactionProps) => {
  const isError = transaction.isError === '1';
  const Icon = isError ? ErrorIcon : transaction.method && transactionDataMap[transaction.method]?.icon;

  const transactionValue = parseInt(transaction.value) / 1e18;
  const gasFee = (parseInt(transaction.gasUsed) * parseInt(transaction.gasPrice)) / 1e18;

  const getValueInMaticField = transactionValue > 0 ? transactionValue : gasFee;
  const getValueInDollar = maticUsdValue && getValueInMaticField * parseFloat(maticUsdValue);

  const getValueInDollarField = getValueInDollar && getValueInDollar.toFixed(2) !== '0.00' ? getValueInDollar : 0.01;

  return (
    <a
      href={`${network.blockExplorer}/tx/${transaction.hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center p-4 gap-2"
    >
      {Icon && <Icon />}
      <div>
        <p className="text-white text-xs font-bold">
          {(transaction.method && transactionDataMap[transaction.method]?.methodName) || 'Unknown'}
        </p>
        <p className="text-gray-80 text-xxs font-medium">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="text-white text-sm font-bold flex items-center gap-1">
          {getValueInMaticField.toLocaleString('fullwide', { useGrouping: false })}
          <Matic height="10" width="10" />
          <span className="text-gray-80 text-xxs font-bold uppercase"> Matic</span>
        </p>
        <p className="text-gray-50 text-xxs font-bold text-right">{`${currency(getValueInDollarField)} USD`}</p>
      </div>
    </a>
  );
};
