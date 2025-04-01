import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Transfer } from '../../../types/web3-v1-contracts/Soundchain721';
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionResulted,
  BidPlaced,
  UpdateAuction,
} from '../../../types/web3-v1-contracts/SoundchainAuction';
import { EditionCreated } from '../../../types/web3-v2-contracts/Soundchain721Editions';
import {
  EditionCanceled,
  EditionListed,
  ItemCanceled,
  ItemListed,
  ItemSold,
  ItemUpdated,
} from '../../../types/web3-v2-contracts/SoundchainMarketplaceEditions';
import { config } from '../../config';
import SoundchainCollectible from '../../contract/Soundchain721.json';
import SoundchainAuction from '../../contract/SoundchainAuction.json';
import SoundchainMarketplace from '../../contract/SoundchainMarketplace.json';
import SoundchainCollectibleEditions from '../../contract/v2/Soundchain721Editions.json';
import SoundchainV2Auction from '../../contract/v2/SoundchainAuction.json';
import SoundchainMarketplaceEditions from '../../contract/v2/SoundchainMarketplaceEditions.json';
import { UserModel } from '../../models/User';
import { EventData } from '../../types/BlockchainEvents';
import { Context } from '../../types/Context';
import { auctionEvents, itemEvents, nftEvents } from '../processEvents';

export const blockchainWatcher: Handler = async () => {
  const web3 = new Web3(config.minting.alchemyKey);
  const context = await getContext();

  const fromBlock = await context.blockTrackerService.getCurrentBlockNumber();
  const toBlock = await web3.eth.getBlockNumber();

  if (fromBlock >= toBlock) {
    return;
  }

  const { marketplaceEvents, nftEvents, auctionEvents } = await getAllEvents(web3, fromBlock, toBlock);

  await Promise.all([
    processMarketplaceEvents(marketplaceEvents, context),
    processNFTEvents(nftEvents, context),
    processAuctionEvents(auctionEvents, context),
    context.blockTrackerService.updateCurrentBlocknumber(toBlock + 1),
  ]);
};

const getContext = async () => {
  const user = await UserModel.findOne({ handle: '_system' });
  return new Context({ sub: user._id.toString() });
};

const getAllEvents = async (web3: Web3, fromBlock: number, toBlock: number) => {
  const marketplaceContract = new web3.eth.Contract(
    SoundchainMarketplace.abi as AbiItem[],
    config.minting.contractsV1.marketplaceAddress,
  );
  const marketplaceMultipleEditionContract = new web3.eth.Contract(
    SoundchainMarketplaceEditions.abi as AbiItem[],
    config.minting.contractsV2.marketplaceMultipleEditionAddress,
  );

  const blocks = { fromBlock, toBlock };
  const auctionContract = new web3.eth.Contract(
    SoundchainAuction.abi as AbiItem[],
    config.minting.contractsV1.auctionAddress,
  );
  const auctionV2Contract = new web3.eth.Contract(
    SoundchainV2Auction.abi as AbiItem[],
    config.minting.contractsV2.auctionAddress,
  );
  const nftContract = new web3.eth.Contract(
    SoundchainCollectible.abi as AbiItem[],
    config.minting.contractsV1.nftAddress,
  );
  const nftEditionsContract = new web3.eth.Contract(
    SoundchainCollectibleEditions.abi as AbiItem[],
    config.minting.contractsV2.nftMultipleEditionAddress,
  );

  try {
    const [marketplaceEvents, marketplaceEditionsEvents, nftEvents, nftEditionsEvents, auctionEvents, auctionV2Events] =
      await Promise.all([
        marketplaceContract.getPastEvents('allEvents', blocks),
        marketplaceMultipleEditionContract.getPastEvents('allEvents', blocks),
        nftContract.getPastEvents('allEvents', blocks),
        nftEditionsContract.getPastEvents('allEvents', blocks),
        auctionContract.getPastEvents('allEvents', blocks),
        auctionV2Contract.getPastEvents('allEvents', blocks),
      ]);
    return {
      marketplaceEvents: [...marketplaceEvents, ...marketplaceEditionsEvents],
      nftEvents: [...nftEvents, ...nftEditionsEvents],
      auctionEvents: [...auctionEvents, ...auctionV2Events],
    };
  } catch (error) {
    console.error(`From block: ${fromBlock}\nTo block: ${toBlock}\n${error}`);
  }
};

const processMarketplaceEvents = async (events: EventData[], context: Context) => {
  for (const event of events) {
    switch (event.event) {
      case 'ItemListed':
        {
          await itemEvents.listed(event as unknown as ItemListed, context);
        }
        break;
      case 'ItemSold':
        {
          await itemEvents.sold(event as unknown as ItemSold, context);
        }
        break;
      case 'ItemUpdated':
        {
          await itemEvents.updated(event as unknown as ItemUpdated, context);
        }
        break;
      case 'ItemCanceled':
        {
          await itemEvents.canceled(event as unknown as ItemCanceled, context);
        }
        break;
      case 'EditionListed':
        {
          await itemEvents.editionListed(event as unknown as EditionListed, context);
        }
        break;
      case 'EditionCanceled':
        {
          await itemEvents.editionCanceled(event as unknown as EditionCanceled, context);
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
          await nftEvents.transfer(event as unknown as Transfer, context);
        }
        break;
      case 'EditionCreated':
        {
          await nftEvents.editionCreated(event as unknown as EditionCreated, context);
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
          await auctionEvents.created(event as unknown as AuctionCreated, context);
        }
        break;
      case 'BidPlaced':
        {
          await auctionEvents.bidPlaced((event as unknown as BidPlaced).returnValues, context);
        }
        break;
      case 'AuctionResulted':
        {
          await auctionEvents.resulted((event as unknown as AuctionResulted).returnValues, context);
        }
        break;
      case 'AuctionCancelled':
        {
          await auctionEvents.canceled((event as unknown as AuctionCancelled).returnValues, context);
        }
        break;
      case 'UpdateAuction':
        {
          await auctionEvents.update((event as unknown as UpdateAuction).returnValues, context);
        }
        break;
    }
  }
};
