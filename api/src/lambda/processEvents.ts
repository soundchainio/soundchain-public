/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from 'web3';
import { Transfer } from '../../types/web3-v1-contracts/Soundchain721';
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionResulted,
  BidPlaced,
  UpdateAuction
} from '../../types/web3-v1-contracts/SoundchainAuction';
import { ItemCanceled, ItemListed, ItemSold, ItemUpdated } from '../../types/web3-v1-contracts/SoundchainMarketplace';
import { FailedEventModel } from '../models/FailedEvent';
import { Context } from '../types/Context';
import { PendingRequest } from '../types/PendingRequest';
import { fixedDecimals } from '../utils/format';

const zeroAddress = '0x0000000000000000000000000000000000000000';

type ReturnTypes =
  | AuctionCancelled['returnValues']
  | AuctionCreated['returnValues']
  | AuctionResulted['returnValues']
  | BidPlaced['returnValues']
  | UpdateAuction['returnValues']
  | ItemCanceled['returnValues']
  | ItemListed['returnValues']
  | ItemSold['returnValues']
  | ItemUpdated['returnValues']
  | Transfer;

function _execute<T extends ReturnTypes>(f: (returnValues: T, context: Context) => Promise<void>) {
  return async function (this: any, ...args: [returnValues: T, context: Context]) {
    const a: [returnValues: T, context: Context] = [...args];
    try {
      await f.apply(this, a);
    } catch (e: any) {
      const failedEvent = new FailedEventModel({ name: f.name, error: e.message, data: a[0] });
      await failedEvent.save();
    }
  };
}

const processItemListed = async (returnValues: ItemListed['returnValues'], context: Context): Promise<void> => {
  const { owner, nft, tokenId, pricePerItem, OGUNPricePerItem, acceptsMATIC, acceptsOGUN, startingTime } = returnValues;
  const [user, listedBefore] = await Promise.all([
    context.userService.getUserByWallet(owner),
    context.listingItemService.wasListedBefore(parseInt(tokenId)),
  ]);
  if (!user) {
    return;
  }
  const profile = await context.profileService.getProfile(user.profileId);
  if (!profile.verified && !listedBefore) {
    context.trackService.setPendingNone(parseInt(tokenId));
    return;
  }
  await Promise.all([
    context.buyNowItemService.createBuyNowItem({
      owner,
      nft,
      tokenId: parseInt(tokenId),
      pricePerItem: pricePerItem,
      pricePerItemToShow: getPriceToShow(pricePerItem),
      OGUNPricePerItem: OGUNPricePerItem,
      OGUNPricePerItemToShow: getPriceToShow(OGUNPricePerItem),
      acceptsMATIC: acceptsMATIC,
      acceptsOGUN: acceptsOGUN,
      startingTime: parseInt(startingTime),
    }),
    context.trackService.setPendingNone(parseInt(tokenId)),
  ]);
  console.log('ItemListed');
};

const processItemSold = async (returnValues: ItemSold['returnValues'], context: Context): Promise<void> => {
  const { tokenId, seller, buyer, pricePerItem } = returnValues;
  await context.buyNowItemService.finishListing(tokenId, seller, buyer, getPriceToShow(pricePerItem));
  console.log('ItemSold');
};

const processItemUpdated = async (returnValues: ItemUpdated['returnValues'], context: Context): Promise<void> => {
  const { tokenId, newPrice, newOGUNPrice, acceptsMATIC, acceptsOGUN, startingTime } = returnValues;
  await Promise.all([
    context.buyNowItemService.updateBuyNowItem(parseInt(tokenId), {
      pricePerItem: newPrice,
      pricePerItemToShow: getPriceToShow(newPrice),
      OGUNPricePerItem: newOGUNPrice,
      OGUNPricePerItemToShow: getPriceToShow(newOGUNPrice),
      acceptsMATIC,
      acceptsOGUN,
      startingTime: parseInt(startingTime),
    }),
    context.trackService.setPendingNone(parseInt(tokenId)),
  ]);
  console.log('ItemUpdated');
};

const processItemCanceled = async (returnValues: ItemCanceled['returnValues'], context: Context): Promise<void> => {
  const { tokenId } = returnValues;
  await context.buyNowItemService.setNotValid(parseInt(tokenId));
  await context.trackService.setPendingNone(parseInt(tokenId));
  console.log('ItemCanceled');
};

const processTransfer = async (event: Transfer, context: Context): Promise<void> => {
  const { transactionHash, address, returnValues } = event;
  if (returnValues.from === zeroAddress) {
    await context.trackService.updateTrackByTransactionHash(transactionHash, {
      nftData: {
        tokenId: parseInt(returnValues.tokenId),
        contract: address,
        pendingRequest: PendingRequest.None,
      },
    });
  } else if (returnValues.to === zeroAddress) {
    const track = await context.trackService.getTrackByTokenId(parseInt(returnValues.tokenId));
    await context.trackService.deleteTrackByAdmin(track._id);
  } else {
    await context.trackService.updateOwnerByTokenId(parseInt(returnValues.tokenId), returnValues.to);
  }
  console.log('Transfer');
};

const processAuctionCreated = async (returnValues: AuctionCreated['returnValues'], context: Context): Promise<void> => {
  const { nftAddress, tokenId, owner, reservePrice, isPaymentOGUN, startTimestamp, endTimestamp } = returnValues;
  const [user, listedBefore] = await Promise.all([
    context.userService.getUserByWallet(owner),
    context.listingItemService.wasListedBefore(parseInt(tokenId)),
  ]);
  if (!user) {
    return;
  }
  const profile = await context.profileService.getProfile(user.profileId);
  if (!profile.verified && !listedBefore) {
    context.trackService.setPendingNone(parseInt(tokenId));
    return;
  }
  await Promise.all([
    context.auctionItemService.createAuctionItem({
      owner,
      nft: nftAddress,
      tokenId: parseInt(tokenId),
      startingTime: parseInt(startTimestamp),
      endingTime: parseInt(endTimestamp),
      reservePrice: reservePrice,
      reservePriceToShow: getPriceToShow(reservePrice),
      isPaymentOGUN,
    }),
    context.trackService.setPendingNone(parseInt(tokenId)),
  ]);
  console.log('AuctionCreated');
};

const processBidPlaced = async (returnValues: BidPlaced['returnValues'], context: Context): Promise<void> => {
  const { nftAddress, tokenId, bidder, bid } = returnValues;
  const tokenIdAsNumber = parseInt(tokenId);
  const auction = await context.auctionItemService.findAuctionItem(tokenIdAsNumber);
  const [outBided, track, user, seller] = await Promise.all([
    context.bidService.getHighestBid(auction._id),
    context.trackService.getTrackByTokenId(tokenIdAsNumber),
    context.userService.getUserByWallet(bidder),
    context.userService.getUserByWallet(auction.owner),
    context.auctionItemService.updateAuctionItem(tokenIdAsNumber, {
      highestBid: bid,
      highestBidToShow: getPriceToShow(bid),
    }),
  ]);
  if (!user || !seller) {
    return;
  }
  const auctionPromises: Promise<unknown>[] = [
    context.bidService.createBid({
      nft: nftAddress,
      tokenId: tokenIdAsNumber,
      bidder,
      userId: user._id,
      profileId: user.profileId,
      amount: bid,
      amountToShow: getPriceToShow(bid),
      auctionId: auction._id,
    }),
    context.notificationService.notifyNewBid({
      track,
      profileId: seller.profileId,
      price: getPriceToShow(bid),
      auctionId: auction._id,
    }),
  ];
  if (outBided) {
    auctionPromises.push(
      context.notificationService.notifyOutbid({
        track,
        profileId: outBided.profileId,
        price: getPriceToShow(bid),
        auctionId: auction._id,
      }),
    );
  }
  await Promise.all(auctionPromises);
  console.log('BidPlaced');
};

const processAuctionResulted = async (
  returnValues: AuctionResulted['returnValues'],
  context: Context,
): Promise<void> => {
  const { tokenId, winner, oldOwner, winningBid } = returnValues;
  await context.auctionItemService.finishListing(tokenId, oldOwner, winner, getPriceToShow(winningBid));
  console.log('AuctionResulted');
};

const processAuctionCanceled = async (
  returnValues: AuctionCancelled['returnValues'],
  context: Context,
): Promise<void> => {
  const { tokenId } = returnValues;
  await Promise.all([
    context.auctionItemService.setNotValid(parseInt(tokenId)),
    context.trackService.setPendingNone(parseInt(tokenId)),
  ]);
  console.log('AuctionCancelled');
};

const processUpdateAuction = async (returnValues: UpdateAuction['returnValues'], context: Context): Promise<void> => {
  const { tokenId, reservePrice, startTime, endTime } = returnValues;
  await Promise.all([
    context.auctionItemService.updateAuctionItem(parseInt(tokenId), {
      reservePrice: reservePrice,
      reservePriceToShow: getPriceToShow(reservePrice),
      startingTime: parseInt(startTime),
      endingTime: parseInt(endTime),
    }),
    context.trackService.setPendingNone(parseInt(tokenId)),
  ]);
  console.log('UpdateAuction');
};

const getPriceToShow = (wei: string) => fixedDecimals(Web3.utils.fromWei(wei, 'ether'));

export const itemEvents = {
  listed: _execute(processItemListed),
  sold: _execute(processItemSold),
  updated: _execute(processItemUpdated),
  canceled: _execute(processItemCanceled),
};

export const nftEvents = {
  transfer: _execute(processTransfer),
};

export const auctionEvents = {
  created: _execute(processAuctionCreated),
  bidPlaced: _execute(processBidPlaced),
  resulted: _execute(processAuctionResulted),
  canceled: _execute(processAuctionCanceled),
  update: _execute(processUpdateAuction),
};
