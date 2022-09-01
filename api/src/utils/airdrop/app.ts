import path from "path";
import Generator from "./generator";
import { parseUnits } from "ethers/lib/utils";
import { tokenHoldersFileName, whitelistFileName, rewardAmount, decimalsPlaces } from "./config.json";
import { ExtractDataFromCsvParams, GetAmountParams, AudiusHoldersCsv, WhitelistsCsv } from "./types/app";
import csv from 'csvtojson/v2';

const tokenHoldersPath = path.join(__dirname, `./${tokenHoldersFileName}`);
const whitelistPath = path.join(__dirname, `./${whitelistFileName}`);

const decimals = Number(decimalsPlaces) || 18;

const AUDIUS_HOLDERS = 'Audius Holders';
const WHITELIST = 'Whitelist';

const convertAmount = (params: GetAmountParams) => {
  const { amount } = params;

  const fixedAmount = Number(amount).toFixed(decimals).toString()

  return parseUnits(fixedAmount, decimals).toString();
}

const calculateAudiusHoldersAmount = (balance: string) => {
  const maxClaimableAmount = rewardAmount;
  const _maxClaimableAmount = convertAmount({ amount: rewardAmount })
  const _balance = convertAmount({ amount: balance })

  return Number(_balance) < Number(_maxClaimableAmount) ?  balance : maxClaimableAmount;
}

const extractDataFromCsv = async (params: ExtractDataFromCsvParams): Promise<Record<string, string>> => {
  const { filePath, fileName } = params;
  
  const accounts = await csv().fromFile(filePath)
  const airdropHolders: Record<string, string> = {};
  
  if (fileName === AUDIUS_HOLDERS) {
    accounts.forEach((account: AudiusHoldersCsv) => {
      const { HolderAddress, Balance } = account;
      
      const amount = calculateAudiusHoldersAmount(Balance);
      
      const parsedAmount = convertAmount({ amount })
  
  
      airdropHolders[HolderAddress] = parsedAmount
    });
  }

  if (fileName === WHITELIST) {
    accounts.forEach((account: WhitelistsCsv) => {
      const { magicWalletAddress } = account;
  
      airdropHolders[magicWalletAddress] = rewardAmount
    });
  }

  return airdropHolders
}

// Generate Merkle Tree and Proofs
const build = async () => {
  const whitelist = await extractDataFromCsv({ filePath: whitelistPath, fileName: WHITELIST })
  const audiusHolders = await extractDataFromCsv({ filePath: tokenHoldersPath, fileName: AUDIUS_HOLDERS });
  
  // Generate ProoBook
  const fullList = {...audiusHolders, ...whitelist};
  const generator = new Generator(fullList);
  await generator.process();
}

build();