import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionResulted,
  BidPlaced,
  UpdateAuction,
} from '../../types/web3-v1-contracts/SoundchainAuction';
import { ItemUpdated } from '../../types/web3-v1-contracts/SoundchainMarketplace';
import { config } from '../config';
import SoundchainCollectible from '../contract/Soundchain721.json';
import SoundchainAuction from '../contract/SoundchainAuction.json';
import SoundchainMarketplace from '../contract/SoundchainMarketplace.json';
import { UserModel } from '../models/User';
import { ItemCanceled, ItemListed, ItemSold, Transfer } from '../types/BlockchainEvents';
import { Context } from '../types/Context';
import { PendingRequest } from '../types/PendingRequest';

const zeroAddress = '0x0000000000000000000000000000000000000000';

export const blockchainWatcher: Handler = async () => {
  await mongoose.connect(config.db.url, config.db.options);
  const web3 = new Web3(config.minting.alchemyKey);

  const marketplaceContract = new web3.eth.Contract(
    SoundchainMarketplace.abi as AbiItem[],
    config.minting.marketplaceAddress,
  );

  const auctionContract = new web3.eth.Contract(SoundchainAuction.abi as AbiItem[], config.minting.auctionAddress);
  const nftContract = new web3.eth.Contract(SoundchainCollectible.abi as AbiItem[], config.minting.nftAddress);
  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });

  const fromBlock = await context.blockTrackerService.getCurrentBlockNumber();
  const toBlock = await web3.eth.getBlockNumber();

  const marketplaceEvents = await marketplaceContract.getPastEvents('allEvents', {
    fromBlock,
    toBlock,
  });
  const contractEvents = await nftContract.getPastEvents('allEvents', { fromBlock, toBlock });
  const auctionEvents = await auctionContract.getPastEvents('allEvents', { fromBlock, toBlock });

  for (const event of marketplaceEvents) {
    switch (event.event) {
      case 'ItemListed':
        {
          try {
            const { owner, nft, tokenId, pricePerItem, startingTime } = (event as ItemListed).returnValues;
            const [user, listedBefore] = await Promise.all([
              context.userService.getUserByWallet(owner),
              context.listingItemService.wasListedBefore(parseInt(tokenId)),
            ]);
            if (!user) {
              continue;
            }
            const profile = await context.profileService.getProfile(user.profileId);
            if (!profile.verified && !listedBefore) {
              context.trackService.setPendingNone(parseInt(tokenId));
              continue;
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
        }
        break;
      case 'ItemSold':
        {
          try {
            const { tokenId, seller, buyer, pricePerItem } = (event as ItemSold).returnValues;
            await context.buyNowItemService.finishListing(tokenId, seller, buyer, parseInt(pricePerItem));
          } catch (error) {
            console.error(error);
          }
          console.log('ItemSold');
        }
        break;
      case 'ItemUpdated':
        {
          try {
            const { tokenId, newPrice, startingTime } = (event as unknown as ItemUpdated).returnValues;
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
        }
        break;
      case 'ItemCanceled':
        {
          try {
            const { tokenId } = (event as ItemCanceled).returnValues;
            await context.buyNowItemService.setNotValid(parseInt(tokenId));
            await context.trackService.setPendingNone(parseInt(tokenId));
          } catch (error) {
            console.error(error);
          }
          console.log('ItemCanceled');
        }
        break;
    }
  }

  for (const event of contractEvents) {
    switch (event.event) {
      case 'Transfer':
        {
          try {
            const { transactionHash, address, returnValues } = event as Transfer;
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
          } catch (error) {
            console.error(error);
          }
          console.log('Transfer');
        }
        break;
    }
  }

  for (const event of auctionEvents) {
    switch (event.event) {
      case 'AuctionCreated':
        {
          try {
            const { nftAddress, tokenId, owner, reservePrice, startTimestamp, endTimestamp } = (
              event as unknown as AuctionCreated
            ).returnValues;
            const [user, listedBefore] = await Promise.all([
              context.userService.getUserByWallet(owner),
              context.listingItemService.wasListedBefore(parseInt(tokenId)),
            ]);
            if (!user) {
              continue;
            }
            const profile = await context.profileService.getProfile(user.profileId);
            if (!profile.verified && !listedBefore) {
              context.trackService.setPendingNone(parseInt(tokenId));
              continue;
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
        }
        break;
      case 'BidPlaced':
        {
          try {
            const { nftAddress, tokenId, bidder, bid } = (event as unknown as BidPlaced).returnValues;
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
              continue;
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
        }
        break;
      case 'AuctionResulted':
        {
          try {
            const { tokenId, winner, oldOwner, winningBid } = (event as unknown as AuctionResulted).returnValues;
            await context.auctionItemService.finishListing(tokenId, oldOwner, winner, parseInt(winningBid));
          } catch (error) {
            console.error(error);
          }
          console.log('AuctionResulted');
        }
        break;
      case 'AuctionCancelled':
        {
          try {
            const { tokenId } = (event as unknown as AuctionCancelled).returnValues;
            await Promise.all([
              context.auctionItemService.setNotValid(parseInt(tokenId)),
              context.trackService.setPendingNone(parseInt(tokenId)),
            ]);
          } catch (error) {
            console.error(error);
          }
          console.log('AuctionCancelled');
        }
        break;
      case 'UpdateAuction':
        {
          try {
            const { tokenId, reservePrice, startTime, endTime } = (event as unknown as UpdateAuction).returnValues;
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
        }
        break;
    }
  }
  await context.blockTrackerService.updateCurrentBlocknumber(toBlock + 1);
};
