import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pinataClient from '@pinata/sdk';
import { mongoose } from '@typegoose/typegoose';
import { ApolloServer } from 'apollo-server-lambda';
import type { Handler, SQSEvent } from 'aws-lambda';
import express from 'express';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { config } from './config';
import SoundchainCollectible from './contract/SoundchainCollectible/SoundchainCollectible.json';
import SoundchainMarketplace from './contract/SoundchainMarketplace/SoundchainMarketplace.json';
import { UserModel } from './models/User';
import { ItemCanceled, ItemListed, ItemSold, ItemUpdated, TransferSingle } from './types/BlockchainEvents';
import { Context } from './types/Context';
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

  for (const event of marketplaceEvents) {
    switch (event.event) {
      case 'ItemListed':
        {
          const { owner, nft, tokenId, quantity, pricePerItem, startingTime } = (event as ItemListed).returnValues;
          context.listingItemService
            .createListingItem({
              owner,
              nft,
              tokenId: parseInt(tokenId),
              quantity: parseInt(quantity),
              pricePerItem,
              startingTime: parseInt(startingTime),
            })
            .catch(console.error);

          context.trackService.setPendingNone(parseInt(tokenId)).catch(console.error);
          console.log('ItemListed');
        }
        break;
      case 'ItemSold':
        {
          const { tokenId, seller, buyer, pricePerItem } = (event as ItemSold).returnValues;
          context.listingItemService.finishListing(tokenId, seller, buyer, pricePerItem).catch(console.error);
          console.log('ItemSold');
        }
        break;
      case 'ItemUpdated':
        {
          const { tokenId, newPrice } = (event as ItemUpdated).returnValues;
          context.listingItemService
            .updateListingItem(parseInt(tokenId), { pricePerItem: newPrice })
            .catch(console.error);
          context.trackService.setPendingNone(parseInt(tokenId)).catch(console.error);
          console.log('ItemUpdated');
        }
        break;
      case 'ItemCanceled':
        {
          const { tokenId } = (event as ItemCanceled).returnValues;
          context.listingItemService.setNotValid(parseInt(tokenId)).catch(console.error);
          context.trackService.setPendingNone(parseInt(tokenId)).catch(console.error);
          console.log('ItemCanceled');
        }
        break;
    }
  }

  for (const event of contractEvents) {
    switch (event.event) {
      case 'TransferSingle':
        {
          const { transactionHash, address, returnValues } = event as TransferSingle;

          if (returnValues.from === zeroAddress) {
            context.trackService
              .updateTrackByTransactionHash(transactionHash, {
                nftData: {
                  tokenId: parseInt(returnValues.id),
                  quantity: parseInt(returnValues.value),
                  contract: address,
                  pendingRequest: PendingRequest.None,
                },
              })
              .catch(console.error);
          } else {
            context.trackService.updateOwnerByTokenId(parseInt(returnValues.id), returnValues.to).catch(console.error);
          }
          console.log('TransferSingle');
        }
        break;
    }
  }
  context.blockTrackerService.updateCurrentBlocknumber(toBlock + 1);
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
    const contract = new web3.eth.Contract(SoundchainCollectible.abi as AbiItem[], config.minting.contractAddress);

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
      to: config.minting.contractAddress,
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
