import fs from "fs"; // Filesystem
import path from "path"; // Path
import { ProofBookItem, ProofBookItemModel } from '../models/ProofBookItem';

import mongoose from 'mongoose';

const { DATABASE_URL = 'mongodb://localhost:27017' } = process.env;
const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const proofBookPath: string = path.join(__dirname, "../utils/airdrop/output/proofBook.json");

async function seedDb() {
  await dropDb();
  await mongoose.connect(DATABASE_URL, dbOpts);

  console.log('updating DB with proofBook...');

  console.log('Seeding merkle proofs...');

  const proofBookJson = JSON.parse(fs.readFileSync(proofBookPath, 'utf8'));
  const root:string = proofBookJson.root;
  const proofs:ProofBookItem[] = proofBookJson.proofBook;

  // console.log(root);
  // console.log(proofs);

  const proofsBook:ProofBookItem[] = [];

  proofs.forEach(proof => {
    const item = new ProofBookItemModel({root: root, address: proof.address, value: proof.value, merkleProof: proof.merkleProof});
    proofsBook.push(item);
    // console.log(root);
  });

  // console.log(proofsBook[0]);

  await ProofBookItemModel.insertMany(proofsBook);

  console.log('Success!');

  process.exit(0);
}

async function dropDb() {
  const conn = await mongoose.createConnection(DATABASE_URL, dbOpts);
  return conn.dropDatabase();
}

seedDb();
