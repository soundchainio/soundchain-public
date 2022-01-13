/* eslint-disable @typescript-eslint/no-explicit-any */
import { Transfer } from '../../types/web3-v1-contracts/Soundchain721';
import { FailedEventModel } from '../models/FailedEvent';
import { Context } from '../types/Context';
import { PendingRequest } from '../types/PendingRequest';

const zeroAddress = '0x0000000000000000000000000000000000000000';

function _execute(f: (event: any, context: Context) => Promise<void>) {
  return async function (this: any, ...args: [event: any, context: Context]) {
    const a: [event: any, context: Context] = [...args];
    try {
      await f.apply(this, a);
    } catch (e: any) {
      const failedEvent = new FailedEventModel({ name: f.name, error: e.message, data: a[0] });
      console.log({ failedEvent });
      await failedEvent.save();
    }
  };
}

export const processItemListed = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { owner, nft, tokenId, pricePerItem, startingTime } = returnValues;
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
        pricePerItem: parseInt(pricePerItem),
        startingTime: parseInt(startingTime),
      }),
      context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  } catch (error) {
    console.error(error);
  }
  console.log('ItemListed');
};
export const itemListed = _execute(processItemListed);

export const processItemSold = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId, seller, buyer, pricePerItem } = returnValues;
    await context.buyNowItemService.finishListing(tokenId, seller, buyer, parseInt(pricePerItem));
  } catch (error) {
    console.error(error);
  }
  console.log('ItemSold');
};
export const itemSold = _execute(processItemSold);

export const processItemUpdated = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId, newPrice, startingTime } = returnValues;
    await Promise.all([
      context.buyNowItemService.updateBuyNowItem(parseInt(tokenId), {
        pricePerItem: parseInt(newPrice),
        startingTime: parseInt(startingTime),
      }),
      context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  } catch (error) {
    console.error(error);
  }
  console.log('ItemUpdated');
};
export const itemUpdated = _execute(processItemUpdated);

export const processItemCanceled = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId } = returnValues;
    await context.buyNowItemService.setNotValid(parseInt(tokenId));
    await context.trackService.setPendingNone(parseInt(tokenId));
  } catch (error) {
    console.error(error);
  }
  console.log('ItemCanceled');
};
export const itemCanceled = _execute(processItemCanceled);

const processTransfer = async (event: any, context: Context): Promise<void> => {
  const { transactionHash, address, returnValues } = event as unknown as Transfer;
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
export const transfer = _execute(processTransfer);

export const processAuctionCreated = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { nftAddress, tokenId, owner, reservePrice, startTimestamp, endTimestamp } = returnValues;
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
        reservePrice: parseInt(reservePrice),
      }),
      context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  } catch (error) {
    console.error(error);
  }
  console.log('AuctionCreated');
};
export const auctionCreated = _execute(processAuctionCreated);

export const processBidPlaced = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { nftAddress, tokenId, bidder, bid } = returnValues;
    const tokenIdAsNumber = parseInt(tokenId);
    const auction = await context.auctionItemService.findAuctionItem(tokenIdAsNumber);
    const [outBided, track, user, seller] = await Promise.all([
      context.bidService.getHighestBid(auction._id),
      context.trackService.getTrackByTokenId(tokenIdAsNumber),
      context.userService.getUserByWallet(bidder),
      context.userService.getUserByWallet(auction.owner),
      context.auctionItemService.updateAuctionItem(tokenIdAsNumber, {
        highestBid: parseInt(bid),
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
        amount: parseInt(bid),
        auctionId: auction._id,
      }),
      context.notificationService.notifyNewBid({
        track,
        profileId: seller.profileId,
        price: parseInt(bid),
        auctionId: auction._id,
      }),
    ];
    if (outBided) {
      auctionPromises.push(
        context.notificationService.notifyOutbid({
          track,
          profileId: outBided.profileId,
          price: parseInt(bid),
          auctionId: auction._id,
        }),
      );
    }
    await Promise.all(auctionPromises);
  } catch (error) {
    console.error(error);
  }
  console.log('BidPlaced');
};
export const bidPlaced = _execute(processBidPlaced);

export const processAuctionResulted = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId, winner, oldOwner, winningBid } = returnValues;
    await context.auctionItemService.finishListing(tokenId, oldOwner, winner, parseInt(winningBid));
  } catch (error) {
    console.error(error);
  }
  console.log('AuctionResulted');
};
export const auctionResulted = _execute(processAuctionResulted);

export const processAuctionCanceled = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId } = returnValues;
    await Promise.all([
      context.auctionItemService.setNotValid(parseInt(tokenId)),
      context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  } catch (error) {
    console.error(error);
  }
  console.log('AuctionCancelled');
};
export const auctionCanceled = _execute(processAuctionCanceled);

export const processUpdateAuction = async (returnValues: any, context: Context): Promise<void> => {
  try {
    const { tokenId, reservePrice, startTime, endTime } = returnValues;
    await Promise.all([
      context.auctionItemService.updateAuctionItem(parseInt(tokenId), {
        reservePrice: parseInt(reservePrice),
        startingTime: parseInt(startTime),
        endingTime: parseInt(endTime),
      }),
      context.trackService.setPendingNone(parseInt(tokenId)),
    ]);
  } catch (error) {
    console.error(error);
  }
  console.log('UpdateAuction');
};
export const updateAuction = _execute(processUpdateAuction);
