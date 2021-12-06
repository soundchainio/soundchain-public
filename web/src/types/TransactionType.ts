import { AuctionCanceled } from 'icons/AuctionCanceled';
import { AuctionCreated } from 'icons/AuctionCreated';
import { AuctionPlaceBid } from 'icons/AuctionPlaceBid';
import { AuctionResult } from 'icons/AuctionResult';
import { Checkmark2 } from 'icons/Checkmark2';
import { Fire } from 'icons/Fire';
import { ListCanceled } from 'icons/ListCanceled';
import { ListUpdated } from 'icons/ListUpdated';
import { Marketplace } from 'icons/Marketplace';
import { PriceTag } from 'icons/PriceTag';
import { Stars } from 'icons/Stars';
import { Transfer } from 'icons/Transfer';

export const transactionDataMap: Record<
  string,
  { methodName: string; icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element }
> = {
  listItem: { methodName: 'Listed NFT', icon: PriceTag },
  safeMint: { methodName: 'Minted NFT', icon: Stars },
  buyItem: { methodName: 'Bought NFT', icon: Checkmark2 },
  setApprovalForAll: { methodName: 'Approve Marketplace', icon: Marketplace },
  createAuction: { methodName: 'Auction created', icon: AuctionCreated },
  burn: { methodName: 'Burn/Delete NFT', icon: Fire },
  cancelAuction: { methodName: 'Auction canceled', icon: AuctionCanceled },
  cancelListing: { methodName: 'Listed NFT canceled', icon: ListCanceled },
  placeBid: { methodName: 'Place bid', icon: AuctionPlaceBid },
  transferFrom: { methodName: 'Transfered NFT', icon: Transfer },
  transfer: { methodName: 'Transfer', icon: Transfer },
  updateListing: { methodName: 'Listed NFT updated', icon: ListUpdated },
  resultAuction: { methodName: 'Result auction', icon: AuctionResult },
};
