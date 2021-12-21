import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pinataClient from '@pinata/sdk';
import { mongoose } from '@typegoose/typegoose';
import { ApolloServer } from 'apollo-server-lambda';
import type { Handler, SQSEvent } from 'aws-lambda';
import express from 'express';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionResulted,
  BidPlaced,
  UpdateAuction,
} from '../types/web3-v1-contracts/SoundchainAuction';
import { ItemUpdated } from '../types/web3-v1-contracts/SoundchainMarketplace';
import { config } from './config';
import SoundchainCollectible from './contract/Soundchain721.json';
import SoundchainAuction from './contract/SoundchainAuction.json';
import SoundchainMarketplace from './contract/SoundchainMarketplace.json';
import { UserModel } from './models/User';
import muxDataApi from './muxDataApi';
import { ItemCanceled, ItemListed, ItemSold, Transfer } from './types/BlockchainEvents';
import { Context } from './types/Context';
import { MuxDataInputValue, MuxServerData } from './types/MuxData';
import { Metadata, NFT } from './types/NFT';
import { PendingRequest } from './types/PendingRequest';

export const handler: Handler = async (...args) => {
  await mongoose.connect(config.db.url, config.db.options);

  const server = new ApolloServer(config.apollo);
  const apolloHandler = server.createHandler({
    expressAppFromMiddleware(middleware) {
      const app = express();
      app.use(config.express.middlewares);
      app.use(middleware);
      return app;
    },
  });

  return apolloHandler(...args);
};

const zeroAddress = '0x0000000000000000000000000000000000000000';

export const watcher: Handler = async () => {
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
            const auction = await context.auctionItemService.updateAuctionItem(parseInt(tokenId), {
              highestBid: parseInt(bid),
            });
            await context.bidService.createBid({
              nft: nftAddress,
              tokenId: parseInt(tokenId),
              bidder,
              amount: parseInt(bid),
              auctionId: auction._id,
            });
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

export const mint: Handler<SQSEvent> = async event => {
  if (event.Records.length !== 1) {
    console.error('Event message should contain exactly ONE record');
    return;
  }

  const pinToIPFS = async (key: string, name: string) => {
    const s3Client = new S3Client({ region: config.uploads.region, forcePathStyle: true });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);
    const assetResult = await pinata.pinFileToIPFS(response.Body, {
      pinataMetadata: {
        name: name,
      },
    });
    return assetResult;
  };

  const web3 = createAlchemyWeb3(config.minting.alchemyKey);
  const pinata = pinataClient(config.minting.pinataKey, config.minting.pinataSecret);

  try {
    const body: NFT = JSON.parse(event.Records[0].body);
    const { assetKey, artKey, to, ...nft } = body;
    const name = body.name;
    const contract = new web3.eth.Contract(SoundchainCollectible.abi as AbiItem[], config.minting.nftAddress);

    const assetResult = await pinToIPFS(assetKey, name);

    const metadata: Metadata = { ...nft, asset: `ipfs://${assetResult.IpfsHash}` };

    if (artKey) {
      const artResult = await pinToIPFS(artKey, `${name}-preview`);
      metadata.art = `ipfs://${artResult.IpfsHash}`;
    }

    const metadataResult = await pinata.pinJSONToIPFS(metadata, { pinataMetadata: { name: `${name}-metadata` } });

    const nonce = await web3.eth.getTransactionCount(config.minting.walletPublicKey, 'latest'); //get latest nonce

    const transaction = {
      from: config.minting.walletPublicKey,
      to: config.minting.nftAddress,
      nonce,
      gas: 260000, // minimum
      data: contract.methods.safeMint(to, `ipfs://${metadataResult.IpfsHash}`).encodeABI(),
    };

    const signedTransaction = await web3.eth.accounts.signTransaction(transaction, config.minting.walletPrivateKey);

    const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction as string);
    console.log(receipt.transactionHash);
  } catch (e) {
    console.error('Execution error, please check AWS logs', e);
    process.exit(1);
  }
};

export const playbackCount: Handler = async () => {
  const intervalGapInMinutes = 60 * 24; // 24 hours
  const nowTimestampInSeconds = Math.round(Date.now() / 1000);
  const initialTimestampInSeconds = nowTimestampInSeconds - intervalGapInMinutes * 60;

  await mongoose.connect(config.db.url, config.db.options);

  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });

  let url: string;
  const fetch = async (pageSize: number, currentPage: number): Promise<MuxDataInputValue> => {
    try {
      url = `/metrics/unique_viewers/breakdown?group_by=video_id&limit=${pageSize}&page=${currentPage}&timeframe[]=${initialTimestampInSeconds}&timeframe[]=${nowTimestampInSeconds}&order_by=field&order_direction=asc`;
      const { data } = await muxDataApi.get<MuxServerData>(url);

      const values = data.data.map(video => ({ trackId: video.field, amount: video.views }));
      return { totalCount: data.total_row_count, values };
    } catch (error) {
      console.error(error);
      context.logErrorService.createLogError(
        'Lambda function: playbackCount - Error fetching Mux Data',
        `URL: ${url} Error: ${error}`,
      );
    }
  };

  const update = async (inputValue: MuxDataInputValue, url: string): Promise<number> => {
    try {
      return await context.trackService.incrementPlaybackCount(inputValue.values);
    } catch (error) {
      console.error(error);
      context.logErrorService.createLogError(
        'Lambda function: playbackCount - Error updating track',
        `URL: ${url} Error: ${error}`,
      );
    }
  };

  try {
    console.log('Starting');

    let currentPage = 1;
    const pageSize = 10000;

    const inputValues = await fetch(pageSize, currentPage);
    const totalCount = inputValues.totalCount;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (!totalCount) {
      console.log(`${totalCount} tracks fetched`);
      return;
    }

    console.log(`Page size: ${pageSize} - Mux data fetched: ${totalCount} tracks to be updated...`);
    const tracksUpdated = await update(inputValues, url);
    console.log(
      `Page: ${currentPage}/${totalPages} - Tracks on page: ${inputValues.values.length} - Tracks updated: ${tracksUpdated}`,
    );

    if (totalPages > currentPage) {
      for (currentPage = 2; currentPage <= totalPages; currentPage++) {
        const inputValues = await fetch(pageSize, currentPage);
        const tracksUpdated = await update(inputValues, url);
        console.log(
          `Page: ${currentPage}/${totalPages} - Tracks on page: ${inputValues.values.length} - Tracks updated: ${tracksUpdated}`,
        );
      }
    }
  } catch (e) {
    console.error('Execution error, please check AWS logs', e);
    process.exit(1);
  } finally {
    console.log('Finished');
  }
};

export const processAuctions: Handler = async () => {
  await mongoose.connect(config.db.url, config.db.options);

  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });

  await context.auctionItemService.processAuctions();
};
