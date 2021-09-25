import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pinataClient from '@pinata/sdk';
import { mongoose } from '@typegoose/typegoose';
import { ApolloServer } from 'apollo-server-lambda';
import type { Handler, SQSEvent } from 'aws-lambda';
import express from 'express';
import { Readable } from 'stream';
import { AbiItem } from 'web3-utils';
import { abi } from './artifacts/contract/SoundchainCollectible.sol/SoundchainCollectible.json';
import { config } from './config';
import { Metadata, NFT } from './types/NFT';

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

export const mint: Handler<SQSEvent> = async event => {
  if (event.Records.length !== 1) {
    console.error('Event message should contain exactly ONE record');
    return;
  }

  const pinToIPFS = async (key: string, name: string) => {
    const s3Client = new S3Client({ region: config.uploads.region });
    const command = new GetObjectCommand({ Bucket: config.uploads.bucket, Key: key });
    const response = await s3Client.send(command);
    const stream = Readable.from(response.Body);
    const assetResult = await pinata.pinFileToIPFS(stream, {
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
    const { assetKey: assetUrl, artKey: artUrl, to, ...nft } = body;
    const name = body.name;
    const contract = new web3.eth.Contract(abi as AbiItem[], config.minting.contractAddress);

    const assetResult = await pinToIPFS(assetUrl, name);

    const metadata: Metadata = { ...nft, asset: `ipfs://${assetResult.IpfsHash}` };

    if (artUrl) {
      const artResult = await pinToIPFS(artUrl, `${name}-preview`);
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
