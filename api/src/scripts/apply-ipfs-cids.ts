/**
 * Apply IPFS CIDs to MongoDB
 *
 * This script reads the ipfs_pins.json file and updates Track documents
 * with their IPFS CIDs.
 *
 * Prerequisites:
 * - Run pin-to-ipfs.ts first to create ipfs_pins.json
 * - MongoDB connection via SSH tunnel or local
 *
 * Usage: npx ts-node src/scripts/apply-ipfs-cids.ts [options]
 *
 * Options:
 *   --dry-run     Preview updates without making changes
 *   --limit=N     Only process N tracks
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;
const EXPORT_DIR = path.join(__dirname, '..', '..', '..', 'mux_exported');
const PINS_FILE = path.join(EXPORT_DIR, 'ipfs_pins.json');

interface PinResult {
  trackId: string;
  title: string;
  ipfsCid: string;
  ipfsGatewayUrl: string;
  pinSize: number;
  pinnedAt: string;
}

interface PinResults {
  pins: PinResult[];
  lastUpdated: string;
}

const TrackSchema = new mongoose.Schema({
  ipfsCid: String,
  ipfsGatewayUrl: String,
}, { collection: 'tracks', strict: false });

const Track = mongoose.model('Track', TrackSchema);

function parseArgs() {
  const args = process.argv.slice(2);
  const options: any = { dryRun: false };
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
  }
  return options;
}

async function main() {
  const options = parseArgs();

  console.log('💾 Apply IPFS CIDs to MongoDB');
  console.log('=============================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE\n');
  }

  // Load pins
  if (!fs.existsSync(PINS_FILE)) {
    console.error(`❌ Pins file not found: ${PINS_FILE}`);
    console.error('   Run pin-to-ipfs.ts first');
    process.exit(1);
  }

  const pinsData: PinResults = JSON.parse(fs.readFileSync(PINS_FILE, 'utf-8'));
  let pins = pinsData.pins;

  if (options.limit) {
    pins = pins.slice(0, options.limit);
  }

  console.log(`📋 Loaded ${pins.length} pins to apply\n`);

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('🗄️  Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const progress = `[${i + 1}/${pins.length}]`;

    try {
      // Check if already has CID
      const existing = await Track.findById(pin.trackId).lean();

      if (!existing) {
        console.log(`${progress} ⚠️  Not found: ${pin.trackId}`);
        notFound++;
        continue;
      }

      if (existing.ipfsCid === pin.ipfsCid) {
        console.log(`${progress} ⏭️  Already set: ${pin.title}`);
        skipped++;
        continue;
      }

      if (options.dryRun) {
        console.log(`${progress} 🔍 Would update: ${pin.title}`);
        updated++;
        continue;
      }

      // Update track
      await Track.updateOne(
        { _id: new mongoose.Types.ObjectId(pin.trackId) },
        {
          $set: {
            ipfsCid: pin.ipfsCid,
            ipfsGatewayUrl: pin.ipfsGatewayUrl,
          },
        }
      );

      console.log(`${progress} ✅ Updated: ${pin.title}`);
      updated++;

    } catch (err: any) {
      console.log(`${progress} ❌ Error: ${err.message}`);
    }
  }

  await mongoose.disconnect();

  console.log('\n=============================');
  console.log('📊 Complete!');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Not Found: ${notFound}`);
  console.log('=============================\n');
}

main().catch(console.error);
