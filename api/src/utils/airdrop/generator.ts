import fs from "fs"; // Filesystem
import path from "path"; // Path
import keccak256 from "keccak256"; // Keccak256 hashing
import MerkleTree from "merkletreejs"; // MerkleTree.js
import { logger } from "./logger"; // Logging
import { getAddress, parseUnits, solidityKeccak256 } from "ethers/lib/utils"; // Ethers utils

// Output file path
const outputPath: string = path.join(__dirname, "./output/merkle.json");
const proofBookOutputPath: string = path.join(__dirname, "./output/proofBook.json");

// Airdrop recipient addresses and scaled token values
type AirdropRecipient = {
  // Recipient address
  address: string;
  // Scaled-to-decimals token value
  value: string;
};

type ProofBook = {
  address: string;
  value: string;
  merkleProof: string[];
};

export default class Generator {
  // Airdrop recipients
  recipients: AirdropRecipient[] = [];
  proofBook: ProofBook[] = [];
  /**
   * Setup generator
   * @param {Record<string, string>} airdrop address to token claim mapping
   */
  constructor(airdrop: Record<string, string>) {
    // For each airdrop entry
    for (const [address, tokens] of Object.entries(airdrop)) {
      // console.log(parseUnits(tokens.toString(), decimals).toString());
      // Push:
      this.recipients.push({
        // Checksum address
        address: getAddress(address),
        // Scaled number of tokens claimable by recipient
        value: tokens
      });
    }
  }

  /**
   * Generate Merkle Tree leaf from address and value
   * @param {string} address of airdrop claimee
   * @param {string} value of airdrop tokens to claimee
   * @returns {Buffer} Merkle Tree node
   */
  generateLeaf(address: string, value: string): Buffer {
    return Buffer.from(
      // Hash in appropriate Merkle format
      solidityKeccak256(["address", "uint256"], [address, value]).slice(2),
      "hex"
    );
  }

  async process(): Promise<void> {
    logger.info("Generating Merkle tree.");

    // Generate merkle tree
    const merkleTree = new MerkleTree(
      // Generate leafs
      this.recipients.map(({ address, value }) =>
        this.generateLeaf(address, value)
      ),
      // Hashing function
      keccak256,
      { hashLeaves: false, sortPairs: true }
    );

    // Collect and log merkle root
    const merkleRoot: string = merkleTree.getHexRoot();
    logger.info(`Generated Merkle root: ${merkleRoot}`);

    const leaves = merkleTree.getLeaves();

    // For each leaf
    for (let i = 0; i < leaves.length; i++) {
      // Collect leaf
      const leaf = leaves[i];

      // Collect address from leaf
      const address: string = this.recipients[i].address;

      // Collect value from leaf
      const value: string = this.recipients[i].value;

      // Collect proof
      const proof: string[] = merkleTree.getProof(leaf).map(({ position, data }) => data = `0x${data.toString("hex")}`);

      // Collect proof book entry
      this.proofBook.push({
        address,
        // merkleRoot,
        value,
        merkleProof: proof
      });
    }

    // console.log(this.proofBook);

    // Collect and save merkle tree + root
    await fs.writeFileSync(
      // Output to merkle.json
      outputPath,
      // Root + full tree
      JSON.stringify({
        root: merkleRoot,
        tree: merkleTree
      })
    );

    await fs.writeFileSync(
      // Output to merkle.json
      proofBookOutputPath,
      // Root + full tree
      JSON.stringify({
        root: merkleRoot,
        proofBook: this.proofBook
      })
    );

    logger.info("Generated merkle tree and root saved to Merkle.json.");
  }
}