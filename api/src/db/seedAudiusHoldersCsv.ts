import mongoose from 'mongoose';
import CsvToJson from "../utils/airdrop/utils/csvToJson";
import { AudioHolderModel } from '../models/AudioHolder';

const { DATABASE_URL = 'mongodb://localhost:27017' } = process.env;

interface AudiusHolder {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}

const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function seedAudiusHolders() {
  try {
    await dropWhitelistCollection()

    await mongoose.connect(DATABASE_URL, dbOpts);

    const audiusHoldersJson = await CsvToJson.getAudiusHoldersJson();
    
    const modelAudiusHoldersToFeedDatabase = audiusHoldersJson.map((user: AudiusHolder) => {
      return new AudioHolderModel({
        walletAddress: user.HolderAddress,
        amount: user.Balance,
      })
    });

    console.log('Seeding Audius holders');
    await AudioHolderModel.insertMany(modelAudiusHoldersToFeedDatabase);

    console.log('Success!');

    process.exit(0);
  } catch (error) {
    console.error(error)
  }
}

async function dropWhitelistCollection() {
  try {
    console.log('Dropping audiusholders collection if it exists');
    const connection = await mongoose.createConnection(DATABASE_URL, dbOpts);
    await connection.dropCollection("audioholders");
    console.log('audiusholders collection dropped');
  } catch (error) {
    console.log("Collection doesn't exist or an error has ocurred")
    return;
  }
}
  
seedAudiusHolders();

  