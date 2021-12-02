import { AuctionCanceled } from 'icons/AuctionCanceled';
import { AuctionCreated } from 'icons/AuctionCreated';
import { AuctionPlaceBid } from 'icons/AuctionPlaceBid';
import { AuctionResult } from 'icons/AuctionResult';
import { Checkmark2 } from 'icons/Checkmark2';
import { Fire } from 'icons/Fire';
import { ListCanceled } from 'icons/ListCanceled';
import { ListUpdated } from 'icons/ListUpdated';
import { Marketplace } from 'icons/Marketplace';
import { Matic } from 'icons/Matic';
import { PriceTag } from 'icons/PriceTag';
import { Stars } from 'icons/Stars';
import { Transfer } from 'icons/Transfer';
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
  buyItem: { methodName: 'Bought NFT', icon: Checkmark2 },
  setApprovalForAll: { methodName: 'Approve Marketplace', icon: Marketplace },
  transfer: { methodName: 'Transfer', icon: Transfer },
  createAuction: { methodName: 'Auction created', icon: AuctionCreated },
  burn: { methodName: 'Burn/Delete NFT', icon: Fire },
  cancelListing: { methodName: 'Listed NFT canceled', icon: ListCanceled },
  updateListing: { methodName: 'Listed NFT updated', icon: ListUpdated },
  transferFrom: { methodName: 'Transfered NFT', icon: Transfer },
  cancelAuction: { methodName: 'Auction canceled', icon: AuctionCanceled },
  placeBid: { methodName: 'Place bid', icon: AuctionPlaceBid },
  resultAuction: { methodName: 'Result auction', icon: AuctionResult },
};

export const Transaction = ({ transaction, maticUsdValue }: TransactionProps) => {
  const Icon = transaction.method && map[transaction.method].icon;

  const transactionValue = parseInt(transaction.value) / 1e18;
  const gasFee = (parseInt(transaction.gasUsed) * parseInt(transaction.gasPrice)) / 1e18;

  const getValueInMaticField = transactionValue > 0 ? transactionValue : gasFee;
  const getValueInDollar = maticUsdValue && getValueInMaticField * parseFloat(maticUsdValue);

  const getValueInDollarField = getValueInDollar && getValueInDollar.toFixed(2) !== '0.00' ? getValueInDollar : 0.01;

  return (
    <a
      href={`https://mumbai.polygonscan.com/tx/${transaction.hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center p-4 gap-2"
    >
      {Icon && <Icon />}
      <div>
        <p className="text-white text-xs font-bold">
          {(transaction.method && map[transaction.method]?.methodName) || 'Unknown'}
        </p>
        <p className="text-gray-80 text-xxs font-medium">{transaction.date}</p>
      </div>
      <div className="ml-auto">
        <p className="text-white text-sm font-bold flex items-center gap-1">
          {getValueInMaticField}
          <Matic height="10" width="10" />
          <span className="text-gray-80 text-xxs font-bold uppercase"> Matic</span>
        </p>
        <p className="text-gray-50 text-xxs font-bold text-right">{`${currency(getValueInDollarField)} USD`}</p>
      </div>
    </a>
  );
};
