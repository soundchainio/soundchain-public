import dotenv from 'dotenv'
import express from 'express'
import fs from 'fs'
import mongoose from 'mongoose'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import SoundchainCollectible from './contract/SoundchainCollectible/SoundchainCollectible.json'
import SoundchainMarketplace from './contract/SoundchainMarketplace/SoundchainMarketplace.json'
import { ReceiptItemListed, ReceiptSold } from './types'

dotenv.config()

const { PROVIDER_URL, MARKETPLACE_ADDRESS, NFT_ADDRESS, DATABASE_URL = 'mongodb://localhost:27017', DATABASE_SSL_PATH } = process.env

const db = {
  url: DATABASE_URL,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    ssl: Boolean(DATABASE_SSL_PATH),
    sslCA: DATABASE_SSL_PATH && fs.readFileSync(`${__dirname}/${DATABASE_SSL_PATH}`).toString(),
    retryWrites: false,
  },
}

async function bootstrap() {
  await mongoose.connect(db.url, db.options)
}

const app = express()

const web3 = new Web3(PROVIDER_URL)

const marketplaceContract = new web3.eth.Contract(SoundchainMarketplace.abi as AbiItem[], MARKETPLACE_ADDRESS)

const nftContract = new web3.eth.Contract(SoundchainCollectible.abi as AbiItem[], NFT_ADDRESS)

nftContract.events.TransferSingle({}).on('data', (receipt: any) => {
  console.log(receipt.returnValues) // TODO: move mint logic to here, check if has come from 0x0 to know if it's a mint
})

marketplaceContract.events.ItemListed({}).on('data', async (receipt: ReceiptItemListed) => {
  const { owner, nft, tokenId, quantity, pricePerItem, startingTime } = receipt.returnValues

  console.log(receipt)
  // await ListingItemModel.create({
  //   owner,
  //   nft,
  //   tokenId,
  //   quantity,
  //   pricePerItem,
  //   startingTime,
  // })
})

marketplaceContract.events.ItemSold({}).on('data', async (receipt: ReceiptSold) => {
  const { seller, nft, tokenId, quantity, pricePerItem } = receipt.returnValues
  console.log(receipt)
  // await ListingItemModel.findOneAndUpdate(
  //   {
  //     owner: seller,
  //     nft,
  //     tokenId,
  //     quantity,
  //     pricePerItem,
  //   },
  //   { valid: false }
  // )
})

app.listen(3002, async () => {
  await bootstrap()
  console.log(`Listening on 3002`)
})
