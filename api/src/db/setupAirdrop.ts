import type { Handler } from 'aws-lambda';
import path from 'path';
import mongoose from 'mongoose';

import { ProofBookItem, ProofBookItemModel } from '../models/ProofBookItem';
import proofBookJson from '../utils/airdrop/output/proofBook.json';
// const proofBookPath = path.join(__dirname, "../utils/airdrop/output/proofBook.json");

import CsvToJson from "../utils/airdrop/utils/csvToJson";
import { WhitelistEntryModel } from '../models/WhitelistEntry';
import { AudioHolderModel } from '../models/AudioHolder';

const { DATABASE_URL, DATABASE_SSL_PATH } = process.env;

const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: Boolean(DATABASE_SSL_PATH),
  sslCA: DATABASE_SSL_PATH && path.join(__dirname, DATABASE_SSL_PATH),
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
    const connection = await mongoose.createConnection(DATABASE_URL, dbOpts);

    log('Dropping audiusholders collection if it exists');
    await connection.dropCollection("audioholders");
    log('audiusholders collection dropped');
    await connection.dropCollection("whitelistentries");
    log('whitelistentries collection dropped');
    await connection.dropCollection("proofbookitems");
    log('proofbookitems collection dropped');

    log('Seeding merkle proofs...');
  
    const root: string = proofBookJson.root;
    const proofs = proofBookJson.proofBook;
    
    log('Seeding Proofbook')
    await connection.collection('proofbookitems').insertMany(proofs.map((proof) => ({root: root, address: proof.address, value: proof.value, merkleProof: proof.merkleProof})))  
    log('Successfully seeded Proofbook!');

    log('Seeding Audius holders');
    const audiusHoldersJson = await CsvToJson.getAudiusHoldersJson();    
    await connection.collection('audioholders').insertMany(audiusHoldersJson.map((user: CsvEntry) => ({ walletAddress: user.HolderAddress, amount: user.Balance, ogunClaimed: false })));  
    log('Successfully seeded Audius Holders!');

    log('Seeding Whitelist users');
    const whitelistCsvJson = await CsvToJson.getWhitelistJson();
    await connection.collection('whitelistentries').insertMany(whitelistCsvJson.map((user: CsvEntry) => ({ walletAddress: user.HolderAddress, emailAddress: 'whitelist@csv.com', ogunClaimed: false })));      
    log('Successfully seeded Whitelist!');
  
  } catch (error) {
    log(error.toString())
  }

  log('finished')

  return response;
}

  
