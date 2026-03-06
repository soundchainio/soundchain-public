/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from 'web3';
import { Transfer } from '../../types/web3-v1-contracts/Soundchain721';
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionResulted,
  BidPlaced,
  UpdateAuction,
} from '../../types/web3-v1-contracts/SoundchainAuction';
import { EditionCreated } from '../../types/web3-v2-contracts/Soundchain721Editions';
import {
  EditionCanceled,
  EditionListed,
  ItemCanceled,
  ItemListed,
  ItemSold,
  ItemUpdated,
} from '../../types/web3-v2-contracts/SoundchainMarketplaceEditions';
import { FailedEventModel } from '../models/FailedEvent';
import { Context } from '../types/Context';
import { PendingRequest } from '../types/PendingRequest';
import { fixedDecimals } from '../utils/format';

const zeroAddress = '0x0000000000000000000000000000000000000000';

type ReturnTypes =
  | AuctionCancelled['returnValues']
  | AuctionCreated
  | AuctionResulted['returnValues']
  | BidPlaced['returnValues']
  | UpdateAuction['returnValues']
  | ItemCanceled
  | ItemListed
  | ItemSold
  | ItemUpdated
  | Transfer
  | EditionCreated
  | EditionListed
  | EditionCanceled;

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

const processItemListed = async (event: ItemListed, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { owner, nft, tokenId, pricePerItem, OGUNPricePerItem, acceptsMATIC, acceptsOGUN, startingTime } = returnValues;
  const [user, listedBefore] = await Promise.all([
    context.userService.getUserByWallet(owner),
    context.listingItemService.wasListedBefore(parseInt(tokenId), nft),
  ]);
  if (!user) {
    return;
  }
  const profile = await context.profileService.getProfile(user.profileId.toString());
  if (!profile.verified && !listedBefore) {
    context.trackService.setPendingNone(parseInt(tokenId), nft);
    return;
  }
  const track = await context.trackService.setPendingNone(parseInt(tokenId), nft);
  await context.buyNowItemService.createBuyNowItem({
    owner,
    nft,
    contract: address,
    tokenId: parseInt(tokenId),
    pricePerItem: pricePerItem,
    pricePerItemToShow: getPriceToShow(pricePerItem),
    OGUNPricePerItem: OGUNPricePerItem,
    OGUNPricePerItemToShow: getPriceToShow(OGUNPricePerItem),
    acceptsMATIC: acceptsMATIC,
    acceptsOGUN: acceptsOGUN,
    startingTime: parseInt(startingTime),
    trackId: track._id.toString(),
    trackEditionId: track?.trackEditionId,
  });
  if (track.nftData.owner === track.nftData.minter) {
    await context.trackEditionService.markEditionListedIfNeeded(track.trackEditionId, address);
  }
  console.log('ItemListed');
};

const processItemSold = async (event: ItemSold, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { tokenId, seller, buyer, pricePerItem, nft } = returnValues;
  await context.buyNowItemService.finishListing(tokenId, seller, buyer, getPriceToShow(pricePerItem), nft, address);
  console.log('ItemSold');
};

const processItemUpdated = async (event: ItemUpdated, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { tokenId, newPrice, newOGUNPrice, acceptsMATIC, acceptsOGUN, startingTime, nft } = returnValues;
  await Promise.all([
    context.buyNowItemService.updateBuyNowItem(
      parseInt(tokenId),
      {
        pricePerItem: newPrice,
        pricePerItemToShow: getPriceToShow(newPrice),
        OGUNPricePerItem: newOGUNPrice,
        OGUNPricePerItemToShow: getPriceToShow(newOGUNPrice),
        acceptsMATIC,
        acceptsOGUN,
        startingTime: parseInt(startingTime),
      },
      nft,
      address,
    ),
    context.trackService.setPendingNone(parseInt(tokenId), nft),
  ]);
  console.log('ItemUpdated');
};

const processItemCanceled = async (event: ItemCanceled, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { tokenId, nft } = returnValues;
  await context.buyNowItemService.setNotValid(parseInt(tokenId), nft, address);
  const track = await context.trackService.setPendingNone(parseInt(tokenId), nft);
  if (track.nftData.owner === track.nftData.minter) {
    await context.trackEditionService.markEditionUnlistedIfNeeded(track.trackEditionId);
  }
  console.log('ItemCanceled');
};

const processEditionListed = async (event: EditionListed, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { editionId, nft } = returnValues;
  await context.trackEditionService.markEditionListed(parseInt(editionId), nft, address);
  console.log('EditionListed');
};

const processEditionCanceled = async (event: EditionCanceled, context: Context): Promise<void> => {
  const { returnValues } = event;
  const { editionId, nft } = returnValues;
  await context.trackEditionService.markEditionUnlisted(parseInt(editionId), nft);
  console.log('EditionCanceled');
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
    const track = await context.trackService.getTrackByTokenId(parseInt(returnValues.tokenId), address);
    await context.trackService.deleteTrackByAdmin(track._id.toString());
  } else {
    await context.trackService.updateOwnerByTokenId(parseInt(returnValues.tokenId), returnValues.to, address);
  }
  console.log('Transfer');
};

const processEditionCreated = async (event: EditionCreated, context: Context): Promise<void> => {
  const { transactionHash, returnValues, address } = event;

  await context.trackEditionService.updateTrackEditionByTransactionHash(transactionHash, {
    editionId: Number(returnValues.editionNumber),
    contract: address,
    editionData: {
      pendingRequest: PendingRequest.None,
      transactionHash,
      contract: address,
      owner: returnValues.owner,
    },
  });

  console.log('EditionCreated');
};

const processAuctionCreated = async (event: AuctionCreated, context: Context): Promise<void> => {
  const { returnValues, address } = event;
  const { nftAddress, tokenId, owner, reservePrice, startTimestamp, endTimestamp } = returnValues;
  const [user, listedBefore] = await Promise.all([
    context.userService.getUserByWallet(owner),
    context.listingItemService.wasListedBefore(parseInt(tokenId), nftAddress),
  ]);
  if (!user) {
    return;
  }
  const profile = await context.profileService.getProfile(user.profileId.toString());
  if (!profile.verified && !listedBefore) {
    context.trackService.setPendingNone(parseInt(tokenId), nftAddress);
    return;
  }

  const track = await context.trackService.setPendingNone(parseInt(tokenId), nftAddress);

  await context.auctionItemService.createAuctionItem({
    owner,
    nft: nftAddress,
    tokenId: parseInt(tokenId),
    startingTime: parseInt(startTimestamp),
    endingTime: parseInt(endTimestamp),
    reservePrice: reservePrice,
    reservePriceToShow: getPriceToShow(reservePrice),
    contract: address,
    trackId: track._id.toString(),
    trackEditionId: track?.trackEditionId,
  });

  console.log('AuctionCreated');
};

const processBidPlaced = async (returnValues: BidPlaced['returnValues'], context: Context): Promise<void> => {
  const { nftAddress, tokenId, bidder, bid } = returnValues;
  const tokenIdAsNumber = parseInt(tokenId);
  const auction = await context.auctionItemService.findAuctionItem(tokenIdAsNumber);
  const [outBided, track, user, seller] = await Promise.all([
    context.bidService.getHighestBid(auction._id.toString()),
    context.trackService.getTrackByTokenId(tokenIdAsNumber, nftAddress),
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
      userId: user._id.toString(),
      profileId: user.profileId.toString(),
      amount: bid,
      amountToShow: getPriceToShow(bid),
      auctionId: auction._id.toString(),
    }),
    context.notificationService.notifyNewBid({
      track,
      profileId: seller.profileId.toString(),
      price: getPriceToShow(bid),
      auctionId: auction._id.toString(),
    }),
  ];
  if (outBided) {
    auctionPromises.push(
      context.notificationService.notifyOutbid({
        track,
        profileId: outBided.profileId,
        price: getPriceToShow(bid),
        auctionId: auction._id.toString(),
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
  const { tokenId, winner, oldOwner, winningBid, nftAddress } = returnValues;
  await context.auctionItemService.finishListing(tokenId, oldOwner, winner, getPriceToShow(winningBid), nftAddress);
  console.log('AuctionResulted');
};

const processAuctionCanceled = async (
  returnValues: AuctionCancelled['returnValues'],
  context: Context,
): Promise<void> => {
  const { tokenId, nftAddress } = returnValues;
  await Promise.all([
    context.auctionItemService.setNotValid(parseInt(tokenId)),
    context.trackService.setPendingNone(parseInt(tokenId), nftAddress),
  ]);
  console.log('AuctionCancelled');
};

const processUpdateAuction = async (returnValues: UpdateAuction['returnValues'], context: Context): Promise<void> => {
  const { tokenId, reservePrice, startTime, endTime, nftAddress } = returnValues;
  await Promise.all([
    context.auctionItemService.updateAuctionItem(parseInt(tokenId), {
      reservePrice: reservePrice,
      reservePriceToShow: getPriceToShow(reservePrice),
      startingTime: parseInt(startTime),
      endingTime: parseInt(endTime),
    }),
    context.trackService.setPendingNone(parseInt(tokenId), nftAddress),
  ]);
  console.log('UpdateAuction');
};

const getPriceToShow = (wei: string) => fixedDecimals(Web3.utils.fromWei(wei, 'ether'));

export const itemEvents = {
  listed: _execute(processItemListed),
  sold: _execute(processItemSold),
  updated: _execute(processItemUpdated),
  canceled: _execute(processItemCanceled),
  editionListed: _execute(processEditionListed),
  editionCanceled: _execute(processEditionCanceled),
};

export const nftEvents = {
  transfer: _execute(processTransfer),
  editionCreated: _execute(processEditionCreated),
};

export const auctionEvents = {
  created: _execute(processAuctionCreated),
  bidPlaced: _execute(processBidPlaced),
  resulted: _execute(processAuctionResulted),
  canceled: _execute(processAuctionCanceled),
  update: _execute(processUpdateAuction),
};
