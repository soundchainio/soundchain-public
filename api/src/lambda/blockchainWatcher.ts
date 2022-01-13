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
import { ItemCanceled, ItemListed, ItemSold, ItemUpdated } from '../../types/web3-v1-contracts/SoundchainMarketplace';
import { config } from '../config';
import SoundchainCollectible from '../contract/Soundchain721.json';
import SoundchainAuction from '../contract/SoundchainAuction.json';
import SoundchainMarketplace from '../contract/SoundchainMarketplace.json';
import { UserModel } from '../models/User';
import { EventData } from '../types/BlockchainEvents';
import { Context } from '../types/Context';
import {
  auctionCanceled,
  auctionCreated,
  auctionResulted,
  bidPlaced,
  itemCanceled,
  itemListed,
  itemSold,
  itemUpdated,
  transfer,
  updateAuction,
} from './processEvents';

export const blockchainWatcher: Handler = async () => {
  await mongoose.connect(config.db.url, config.db.options);
  const context = await getContext();

  const { marketplaceEvents, nftEvents, auctionEvents, toBlock } = await getAllEvents(context);

  await Promise.all([
    processMarketplaceEvents(marketplaceEvents, context),
    processNFTEvents(nftEvents, context),
    processAuctionEvents(auctionEvents, context),
  ]);

  await context.blockTrackerService.updateCurrentBlocknumber(toBlock + 1);
};

const getContext = async () => {
  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });
  return context;
};

const getAllEvents = async (context: Context) => {
  const web3 = new Web3(config.minting.alchemyKey);

  const marketplaceContract = new web3.eth.Contract(
    SoundchainMarketplace.abi as AbiItem[],
    config.minting.marketplaceAddress,
  );

  const auctionContract = new web3.eth.Contract(SoundchainAuction.abi as AbiItem[], config.minting.auctionAddress);
  const nftContract = new web3.eth.Contract(SoundchainCollectible.abi as AbiItem[], config.minting.nftAddress);

  const fromBlock = await context.blockTrackerService.getCurrentBlockNumber();
  const toBlock = await web3.eth.getBlockNumber();

  const blocks = { fromBlock, toBlock };

  const marketplaceEvents = await marketplaceContract.getPastEvents('allEvents', blocks);
  const nftEvents = await nftContract.getPastEvents('allEvents', blocks);
  const auctionEvents = await auctionContract.getPastEvents('allEvents', blocks);
  return { marketplaceEvents, nftEvents, auctionEvents, toBlock };
};

const processMarketplaceEvents = async (events: EventData[], context: Context) => {
  for (const event of events) {
    switch (event.event) {
      case 'ItemListed':
        {
          await itemListed((event as unknown as ItemListed).returnValues, context);
        }
        break;
      case 'ItemSold':
        {
          await itemSold((event as unknown as ItemSold).returnValues, context);
        }
        break;
      case 'ItemUpdated':
        {
          await itemUpdated((event as unknown as ItemUpdated).returnValues, context);
        }
        break;
      case 'ItemCanceled':
        {
          await itemCanceled((event as unknown as ItemCanceled).returnValues, context);
        }
        break;
    }
  }
};

const processNFTEvents = async (events: EventData[], context: Context) => {
  for (const event of events) {
    switch (event.event) {
      case 'Transfer':
        {
          await transfer(event, context);
        }
        break;
    }
  }
};

const processAuctionEvents = async (events: EventData[], context: Context) => {
  for (const event of events) {
    switch (event.event) {
      case 'AuctionCreated':
        {
          await auctionCreated((event as unknown as AuctionCreated).returnValues, context);
        }
        break;
      case 'BidPlaced':
        {
          await bidPlaced((event as unknown as BidPlaced).returnValues, context);
        }
        break;
      case 'AuctionResulted':
        {
          await auctionResulted((event as unknown as AuctionResulted).returnValues, context);
        }
        break;
      case 'AuctionCancelled':
        {
          await auctionCanceled((event as unknown as AuctionCancelled).returnValues, context);
        }
        break;
      case 'UpdateAuction':
        {
          await updateAuction((event as unknown as UpdateAuction).returnValues, context);
        }
        break;
    }
  }
};
