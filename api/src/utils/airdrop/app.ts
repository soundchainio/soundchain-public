import fs from "fs/promises"; // Filesystem
import path from "path"; // Path routing
import Generator from "./generator"; // Generator
import { logger } from "./logger"; // Logging
import { parseUnits } from "ethers/lib/utils"; // Ethers utils

// Config file path
const dataPath: string = path.join(__dirname, "./token-holders.csv");

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

      const rawAmount: string = String(holder[1]).replace("\"", "").replace("\"", ""); 
      const amount = Number(rawAmount).toFixed(decimals).toString();
      const totalTokens = parseUnits(amount, decimals).toString();

      airdropHolders[wallet] = totalTokens;
  });

  return airdropHolders;
}

(async () => {

  const dirPath = dataPath;
  const data = await fs.readFile(dirPath, 'utf8');
  const airdrop : Record<string, string> = extractFromCsv(data?.toString(), 18);

  // Initialize and call generator
  const generator = new Generator(airdrop);
  await generator.process();
})();