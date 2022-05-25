import fs from "fs/promises"; // Filesystem
import path from "path"; // Path routing
import Generator from "./generator"; // Generator
import { logger } from "./logger"; // Logging
import { parseUnits } from "ethers/lib/utils"; // Ethers utils
import {tokenHoldersFileName, whitelistFileName, rewardAmount, decimalsPlaces} from "./config.json"; // config file

// Config file path
const dataPath: string = path.join(__dirname, `./${tokenHoldersFileName}`);
const whitelistPath: string = path.join(__dirname, `./${whitelistFileName}`);

/**
 * Throws error and exists process
 * @param {string} erorr to log
 */
function throwErrorAndExit(error: string): void {
  logger.error(error);
  process.exit(1);
}

function extractFromCsv(data:string, decimals:number): Record<string, string> {
  const rawList = data.split("\r\n");
  rawList.shift();
  const airdropHolders: Record<string, string> = {};

  rawList.forEach(function(row){
      const holder = row.split(",");

      const addr: string = String(holder[0]).replace("\"", "").replace("\"", "");
      const wallet: string = addr as keyof typeof airdropHolders;

      let totalTokens = "0";

      if(rewardAmount) {
        const amount = Number(rewardAmount).toFixed(decimals).toString();
        totalTokens = parseUnits(amount, decimals).toString();
      } else {
        const rawAmount: string = String(holder[1]).replace("\"", "").replace("\"", ""); 
        const amount = Number(rawAmount).toFixed(decimals).toString();
        totalTokens = parseUnits(amount, decimals).toString();
      }

      airdropHolders[wallet] = totalTokens;
  });

  return airdropHolders;
}

(async () => {
  // Read config file
  const data = await fs.readFile(dataPath, 'utf8');
  const whitelistData = await fs.readFile(whitelistPath, 'utf8');

  const configDecimals:number = decimalsPlaces || 18;

  const airdrop : Record<string, string> = extractFromCsv(data?.toString(), configDecimals); //Extract data from csv stored in dataPath
  const whitelist : Record<string, string> = extractFromCsv(whitelistData?.toString(), configDecimals); //Extract data from csv stored in dataPath

  const fullList = {...airdrop, ...whitelist};

  // Initialize and call generator
  const generator = new Generator(fullList); // Initialize generator
  await generator.process(); //this calls the main function at generator.ts
})();