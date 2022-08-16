import type { Handler } from 'aws-lambda';
import path from 'path';
import mongoose from 'mongoose';

import { ProofBookItem, ProofBookItemModel } from '../models/ProofBookItem';
import proofBookJson from '../utils/airdrop/output/proofBook.json';
// const proofBookPath = path.join(__dirname, "../utils/airdrop/output/proofBook.json");

import CsvToJson from "../utils/airdrop/utils/csvToJson";
import { WhitelistEntryModel } from '../models/WhitelistEntry';
import { AudioHolderModel } from '../models/AudioHolder';

const { DATABASE_URL_PATH = 'mongodb://localhost:27017', DATABASE_SSL_PATH } = process.env;

const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: Boolean(DATABASE_SSL_PATH),
  sslCA: DATABASE_SSL_PATH && path.join(__dirname, 'src', DATABASE_SSL_PATH),
  retryWrites: false,
};

export const handler: Handler = async () => {
  return await seedAll();
};

interface CsvEntry {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}

async function seedAll() {
  const response: string[] = [];

  const log = (msg: string) => {
    response.push(msg);
  }

  try {
    log('dropping existing airdrop related collections...')
    await dropWhitelistCollection()

    await mongoose.connect(DATABASE_URL_PATH, dbOpts);

    log('updating DB with proofBook...');
    log('Seeding merkle proofs...');
  
    // const root: string = proofBookJson.root;
    // const proofs:ProofBookItem[] = proofBookJson.proofBook;
  
    // const proofsBook:ProofBookItem[] = [];
  
    // proofs.forEach(proof => {
    //   const item = new ProofBookItemModel({root: root, address: proof.address, value: proof.value, merkleProof: proof.merkleProof});
    //   proofsBook.push(item);
    // });
  
    // log('Seeding Proofbook')
    // await ProofBookItemModel.insertMany(proofsBook);
  
    // log('Successfully seeded Proofbook!');

    // const audiusHoldersJson = await CsvToJson.getAudiusHoldersJson();
    
    // const modelAudiusHoldersToFeedDatabase = audiusHoldersJson.map((user: CsvEntry) => {
    //   return new AudioHolderModel({
    //     walletAddress: user.HolderAddress,
    //     amount: user.Balance,
    //   })
    // });

    // log('Seeding Audius holders');
    // await AudioHolderModel.insertMany(modelAudiusHoldersToFeedDatabase);

    // log('Successfully seeded Audius Holders!');

    // const whilistCsvJson = await CsvToJson.getWhitelistJson();

    // const modelWhitelistEntryToFeedDatabase = whilistCsvJson.map((user: CsvEntry) => {
    //   return new WhitelistEntryModel({
    //       walletAddress: user.HolderAddress,
    //       emailAddress: 'whitelist@csv.com',
    //     })
    // });
    
    // log('Seeding Whitelist users');
    // await WhitelistEntryModel.insertMany(modelWhitelistEntryToFeedDatabase);
  
    // log('Successfully seeded Whitelist!');
  
  } catch (error) {
    log(error.toString())
  }

  log('finished')

  return response;
}

async function dropWhitelistCollection() {
  try {
    console.log('Dropping audiusholders collection if it exists');
    const connection = await mongoose.createConnection(DATABASE_URL_PATH, dbOpts);
    await connection.dropCollection("audioholders");
    console.log('audiusholders collection dropped');
    await connection.dropCollection("whitelistentries");
    console.log('whitelistentries collection dropped');
    await connection.dropCollection("proofbookitems");
    console.log('proofbookitems collection dropped');
  } catch (error) {
    console.log("Collection doesn't exist or an error has ocurred")
    return;
  }
}

  
