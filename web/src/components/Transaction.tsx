import { Activity } from 'icons/Activity';
import { Checkmark2 } from 'icons/Checkmark2';
import { PriceTag } from 'icons/PriceTag';
import { Stars } from 'icons/Stars';
import { PolygonscanResultObj } from 'lib/graphql';
import { currency } from 'utils/format';

interface TransactionProps {
  transaction: PolygonscanResultObj;
  maticUsdValue?: string;
}

interface TransactionData {
  methodName: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

const map: Record<string, TransactionData> = {
  listItem: { methodName: 'Listed NFT', icon: PriceTag },
  safeMint: { methodName: 'Minted NFT', icon: Stars },
  buyItem: { methodName: 'Bought NFT Item', icon: Activity },
  setApprovalForAll: { methodName: 'Set Approval for all', icon: Checkmark2 },
};

export const Transaction = ({ transaction, maticUsdValue }: TransactionProps) => {
  const Icon = transaction.method && map[transaction.method].icon;

  const gasFee = (parseInt(transaction.gasUsed) * parseInt(transaction.gasPrice)) / 1e18;
  return (
    <div className="flex items-center p-4 gap-2">
      {Icon && <Icon />}
      <div>
        <p className="text-white text-xs font-bold">
          {(transaction.method && map[transaction.method]?.methodName) || 'Off SoundChain'}
        </p>
        <p className="text-gray-80 text-xxs font-medium">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="text-white text-sm font-bold">
          {gasFee}
          <span className="text-gray-80 text-xxs font-bold uppercase"> Matic</span>
        </p>
        {maticUsdValue && (
          <p className="text-gray-50 text-xxs font-bold text-right">
            {`${currency(gasFee * parseFloat(maticUsdValue))} USD`}
          </p>
        )}
      </div>
    </div>
  );
};
