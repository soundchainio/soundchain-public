import mongoose from 'mongoose';
import CsvToJson from "../utils/airdrop/utils/csvToJson";
import { WhitelistEntryModel } from '../models/WhitelistEntry';

const { DATABASE_URL = 'mongodb://localhost:27017' } = process.env;

interface WhitelistUser {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}

const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function seedWhitelistCsv() {
  await dropWhitelistCollection()

  await mongoose.connect(DATABASE_URL, dbOpts);

  const whilistCsvJson = await CsvToJson.getWhitelistJson();

  const modelWhitelistEntryToFeedDatabase = whilistCsvJson.map((user: WhitelistUser) => {
    return new WhitelistEntryModel({
        walletAddress: user.HolderAddress,
        emailAddress: 'whitelist@csv.com',
      })
  });
  
  console.log('Seeding Whitelist users');
  await WhitelistEntryModel.insertMany(modelWhitelistEntryToFeedDatabase);

  console.log('Success!');

  process.exit(0);
}

async function dropWhitelistCollection() {
  try {
    const connection = await mongoose.createConnection(DATABASE_URL, dbOpts);
    await connection.dropCollection("whitelistentries");
  } catch (error) {
    console.log("Collection doesn't exist or an error has ocurred")
    return
  }
}

seedWhitelistCsv();
