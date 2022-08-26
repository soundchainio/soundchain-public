import { AuctionCanceled } from 'icons/AuctionCanceled'
import { AuctionCreated } from 'icons/AuctionCreated'
import { AuctionPlaceBid } from 'icons/AuctionPlaceBid'
import { AuctionResult } from 'icons/AuctionResult'
import { Checkmark2 } from 'icons/Checkmark2'
import { Fire } from 'icons/Fire'
import { ListCanceled } from 'icons/ListCanceled'
import { ListUpdated } from 'icons/ListUpdated'
import { Marketplace } from 'icons/Marketplace'
import { PriceTag } from 'icons/PriceTag'
import { Stars } from 'icons/Stars'
import { Transfer } from 'icons/Transfer'

export const transactionDataMap: Record<
  string,
  { methodName: string; icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element }
> = {
  listItem: { methodName: 'List NFT', icon: PriceTag },
  listEdition: { methodName: 'List NFT', icon: PriceTag },
  listBatch: { methodName: 'List NFT', icon: PriceTag },
  safeMint: { methodName: 'Mint NFT', icon: Stars },
  safeMintToEdition: { methodName: 'Mint NFT', icon: Stars },
  safeMintToEditionQuantity: { methodName: 'Mint NFT', icon: Stars },
  createEdition: { methodName: 'Mint Edition', icon: Stars },
  buyItem: { methodName: 'Buy NFT', icon: Checkmark2 },
  setApprovalForAll: { methodName: 'Approve Marketplace', icon: Marketplace },
  createAuction: { methodName: 'Create auction', icon: AuctionCreated },
  burn: { methodName: 'Burn/Delete NFT', icon: Fire },
  cancelAuction: { methodName: 'Cancel auction', icon: AuctionCanceled },
  cancelListing: { methodName: 'Cancel NFT listing', icon: ListCanceled },
  cancelEditionListing: { methodName: 'Cancel NFT listing', icon: ListCanceled },
  cancelListingBatch: { methodName: 'Cancel NFT listing', icon: ListCanceled },
  placeBid: { methodName: 'Place bid', icon: AuctionPlaceBid },
  transferFrom: { methodName: 'Transfer NFT', icon: Transfer },
  transfer: { methodName: 'Transfer', icon: Transfer },
  updateListing: { methodName: 'Update NFT listing', icon: ListUpdated },
  resultAuction: { methodName: 'Result auction', icon: AuctionResult },
}
