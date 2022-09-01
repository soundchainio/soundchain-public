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
  try {
    const connection = await mongoose.createConnection(DATABASE_URL, dbOpts);

    console.log('Dropping collections if they exists');
    try {
      await connection.dropCollection("audioholders");
      console.log('audiusholders collection dropped');       
    } catch (error) {
      console.log(error.toString())      
    }
    try {
      await connection.dropCollection("whitelistentries");
      console.log('whitelistentries collection dropped');       
    } catch (error) {
      console.log(error.toString())      
    }
    try {
      await connection.dropCollection("proofbookitems");
      console.log('proofbookitems collection dropped');       
    } catch (error) {
      console.log(error.toString())      
    }

    console.log('Seeding merkle proofs...');
  
    const root: string = proofBookJson.root;
    const proofs: ProofBook[] = proofBookJson.proofBook;
    
    console.log('Seeding Proofbook')
    await connection.collection('proofbookitems').insertMany(proofs.map((proof) => ({root: root, address: proof.address, value: proof.value, merkleProof: proof.merkleProof})))  
    console.log('Successfully seeded Proofbook!');

    console.log('Seeding Audius holders');  
    await connection.collection('audioholders').insertMany(audiusHoldersJson.map((user: AudiusHoldersCsv) => ({ walletAddress: user.HolderAddress, amount: user.Balance, ogunClaimed: false })));  
    console.log('Successfully seeded Audius Holders!');

    console.log('Seeding Whitelist users');
    await connection.collection('whitelistentries').insertMany(whitelistJson.map((user: WhitelistsCsv) => ({ walletAddress: user.magicWalletAddress, emailAddress: user.email, ogunClaimed: false })));      
    console.log('Successfully seeded Whitelist!');
  
  } catch (error) {
    console.log(error.toString())
  }

  console.log('finished')
};
