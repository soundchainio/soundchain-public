import { Arg, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql';
import { config } from '../config';
import { ListingItem } from '../models/ListingItem';
import { Context } from '../types/Context';
import { FilterListingItemInput } from '../types/FilterListingItemInput';
import { TrackPrice } from '../types/TrackPrice';

@Resolver(ListingItem)
export class ListingItemResolver {
  @FieldResolver(() => String)
  contract(@Root() listingItem: ListingItem): string {
    // Fallback for the old nft that didn't have this set
    return listingItem.contract || (config.minting.contractsV1.marketplaceAddress as string);
  }

  @Query(() => ListingItem, { nullable: true })
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('input') { tokenId, contractAddress }: FilterListingItemInput,
  ): Promise<ListingItem | void> {
    const item = await listingItemService.getListingItem(tokenId, contractAddress);
    if (!item) return undefined;

    // Transform AuctionItem or BuyNowItem to ListingItem
    const isAuctionItem = 'reservePrice' in item; // Type guard for AuctionItem
    return {
      _id: item._id, // Keep _id as ObjectId
      id: item._id.toString(), // id as string for GraphQL
      owner: item.owner,
      nft: item.nft,
      tokenId: item.tokenId,
      contract: item.nft || contractAddress,
      startingTime: item.startingTime,
      endingTime: 'endingTime' in item ? item.endingTime : undefined, // Only AuctionItem has this
      reservePrice: 'reservePrice' in item ? item.reservePrice : undefined, // Only AuctionItem
      selectedCurrency: 'selectedCurrency' in item ? item.selectedCurrency : 'MATIC', // BuyNowItem has this, default to MATIC for AuctionItem
      reservePriceToShow: 'reservePriceToShow' in item ? item.reservePriceToShow : undefined, // Only AuctionItem
      pricePerItem: 'pricePerItem' in item ? item.pricePerItem : undefined, // Only BuyNowItem
      pricePerItemToShow: 'pricePerItemToShow' in item ? item.pricePerItemToShow : undefined, // Only BuyNowItem
      OGUNPricePerItem: 'OGUNPricePerItem' in item ? item.OGUNPricePerItem : undefined, // Only BuyNowItem
      OGUNPricePerItemToShow: 'OGUNPricePerItemToShow' in item ? item.OGUNPricePerItemToShow : undefined, // Only BuyNowItem
      acceptsMATIC: 'acceptsMATIC' in item ? item.acceptsMATIC : undefined, // Only BuyNowItem
      acceptsOGUN: 'acceptsOGUN' in item ? item.acceptsOGUN : undefined, // Only BuyNowItem
      isPaymentOGUN: 'isPaymentOGUN' in item ? item.isPaymentOGUN : undefined, // Only AuctionItem
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  @Query(() => TrackPrice, { nullable: true })
  async cheapestListingItem(
    @Ctx() { listingItemService }: Context,
    @Arg('trackEditionId') trackEditionId: string,
  ): Promise<TrackPrice> {
    return listingItemService.getCheapestListingItem(trackEditionId);
  }
}
