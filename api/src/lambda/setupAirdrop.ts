import type { Handler } from 'aws-lambda';
import fs from 'fs';
import mongoose from 'mongoose';
import proofBookJson from '../utils/airdrop/output/proofBook.json';
import audiusHoldersJson from "../utils/airdrop/output/audiusHolders.json";
import whitelistJson from "../utils/airdrop/output/whitelist.json";

const { DATABASE_URL, DATABASE_SSL_PATH } = process.env;

interface ProofBook {
  address: string;
  value: string;
  merkleProof: string[]
}

export interface AudiusHoldersCsv {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}

export interface WhitelistsCsv {
  _id: string;
  email: string;
  magicWalletAddress: string;
}

const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: Boolean(DATABASE_SSL_PATH),
  sslCA: DATABASE_SSL_PATH && fs.readFileSync(`${__dirname}/../${DATABASE_SSL_PATH}`).toString(),
  retryWrites: false,
};

export const setupAirdrop: Handler = async () => {
  const response: string[] = [];

  const log = (msg: string) => {
    response.push(msg);
  }
  
  try {
    const connection = await mongoose.createConnection(DATABASE_URL, dbOpts);

    log('Dropping collections if they exists');
    try {
      await connection.dropCollection("audioholders");
      log('audiusholders collection dropped');       
    } catch (error) {
      log(error.toString())      
    }
    try {
      await connection.dropCollection("whitelistentries");
      log('whitelistentries collection dropped');       
    } catch (error) {
      log(error.toString())      
    }
    try {
      await connection.dropCollection("proofbookitems");
      log('proofbookitems collection dropped');       
    } catch (error) {
      log(error.toString())      
    }

    log('Seeding merkle proofs...');
  
    const root: string = proofBookJson.root;
    const proofs: ProofBook[] = proofBookJson.proofBook;
    
    log('Seeding Proofbook')
    await connection.collection('proofbookitems').insertMany(proofs.map((proof) => ({root: root, address: proof.address, value: proof.value, merkleProof: proof.merkleProof})))  
    log('Successfully seeded Proofbook!');

    log('Seeding Audius holders');  
    await connection.collection('audioholders').insertMany(audiusHoldersJson.map((user: AudiusHoldersCsv) => ({ walletAddress: user.HolderAddress, amount: user.Balance, ogunClaimed: false })));  
    log('Successfully seeded Audius Holders!');

    log('Seeding Whitelist users');
    await connection.collection('whitelistentries').insertMany(whitelistJson.map((user: WhitelistsCsv) => ({ walletAddress: user.magicWalletAddress, emailAddress: user.email, ogunClaimed: false })));      
    log('Successfully seeded Whitelist!');
  
  } catch (error) {
    log(error.toString())
  }

  log('finished')

  return response;
};
