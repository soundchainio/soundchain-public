/**
 * Pin Local MP4s to IPFS (No Database Required)
 *
 * This script pins local MP4 files to Pinata/IPFS and saves results to JSON.
 * Run apply-ipfs-cids.ts afterwards to update the database.
 *
 * Workflow:
 * 1. Run download-mux-streams.ts to download MP4s
 * 2. Run this script to pin to IPFS (no DB needed)
 * 3. Run apply-ipfs-cids.ts to update MongoDB with CIDs
 *
 * Usage: npx ts-node src/scripts/pin-to-ipfs.ts [options]
 *
 * Options:
 *   --limit=N       Only process N tracks
 *   --skip=N        Skip first N tracks
 *   --parallel=N    Number of parallel pins (default: 2)
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pinataClient from '@pinata/sdk';

dotenv.config({ path: '.env.local' });

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
const PINATA_DEDICATED_GATEWAY = process.env.PINATA_DEDICATED_GATEWAY;

const EXPORT_DIR = path.join(__dirname, '..', '..', '..', 'mux_exported');
const RESULTS_FILE = path.join(EXPORT_DIR, 'ipfs_pins.json');

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

function parseArgs() {
  const args = process.argv.slice(2);
  const options: any = { parallel: 2 };
  for (const arg of args) {
    if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--skip=')) options.skip = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--parallel=')) options.parallel = parseInt(arg.split('=')[1], 10);
  }
  return options;
}

function getGatewayUrl(cid: string): string {
  return PINATA_DEDICATED_GATEWAY
    ? `${PINATA_DEDICATED_GATEWAY}/${cid}`
    : `${PINATA_GATEWAY}/${cid}`;
}

// Load existing results
function loadResults(): PinResults {
  if (fs.existsSync(RESULTS_FILE)) {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  return { pins: [], lastUpdated: new Date().toISOString() };
}

// Save results
function saveResults(results: PinResults) {
  results.lastUpdated = new Date().toISOString();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

async function pinBatch(
  pinata: any,
  tracks: { folder: string; trackId: string; title: string }[],
  existingCids: Set<string>
): Promise<PinResult[]> {
  const results: PinResult[] = [];

  for (const { folder, trackId, title } of tracks) {
    const audioPath = path.join(folder, 'audio.mp4');

    // Skip if already pinned
    if (existingCids.has(trackId)) {
      console.log(`  ⏭️  ${title} - already pinned`);
      continue;
    }

    // Skip if no audio file
    if (!fs.existsSync(audioPath)) {
      console.log(`  ⚠️  ${title} - no audio.mp4`);
      continue;
    }

    try {
      console.log(`  📌 Pinning: ${title}`);
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

      const readableStream = fs.createReadStream(audioPath);
      const pinResult = await pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: {
          name: fileName,
          keyvalues: {
            trackId,
            type: 'audio',
            platform: 'soundchain',
          } as any,
        },
        pinataOptions: { cidVersion: 1 },
      });

      const result: PinResult = {
        trackId,
        title,
        ipfsCid: pinResult.IpfsHash,
        ipfsGatewayUrl: getGatewayUrl(pinResult.IpfsHash),
        pinSize: pinResult.PinSize,
        pinnedAt: new Date().toISOString(),
      };

      results.push(result);
      console.log(`  ✅ ${pinResult.IpfsHash}`);
    } catch (err: any) {
      console.log(`  ❌ ${title}: ${err.message}`);
    }

    // Small delay for rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

async function main() {
  const options = parseArgs();

  console.log('📌 Pin Local MP4s to IPFS');
  console.log('=========================\n');

  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ PINATA_API_KEY and PINATA_API_SECRET required');
    process.exit(1);
  }

  // Initialize Pinata
  console.log('🔗 Connecting to Pinata...');
  const pinata = pinataClient(PINATA_API_KEY, PINATA_API_SECRET);
  await pinata.testAuthentication();
  console.log('✅ Pinata authenticated\n');

  // Load existing results
  const existingResults = loadResults();
  const existingCids = new Set(existingResults.pins.map(p => p.trackId));
  console.log(`📋 Already pinned: ${existingCids.size} tracks\n`);

  // Get track folders
  let trackFolders = fs.readdirSync(EXPORT_DIR)
    .filter(f => {
      const p = path.join(EXPORT_DIR, f);
      return fs.statSync(p).isDirectory() && f !== '_orphans' && !f.startsWith('.');
    });

  if (options.skip) trackFolders = trackFolders.slice(options.skip);
  if (options.limit) trackFolders = trackFolders.slice(0, options.limit);

  console.log(`📁 Processing ${trackFolders.length} track folders\n`);

  // Load tracks with metadata
  const tracks: { folder: string; trackId: string; title: string }[] = [];
  for (const trackId of trackFolders) {
    const folder = path.join(EXPORT_DIR, trackId);
    const metaPath = path.join(folder, 'metadata.json');

    let title = 'Untitled';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        title = meta.title || 'Untitled';
      } catch {}
    }

    tracks.push({ folder, trackId, title });
  }

  // Process in batches
  const batchSize = options.parallel;
  let totalPinned = 0;

  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tracks.length / batchSize)}`);

    const batchResults = await pinBatch(pinata, batch, existingCids);

    // Save incrementally
    existingResults.pins.push(...batchResults);
    saveResults(existingResults);
    totalPinned += batchResults.length;

    // Update existing set
    batchResults.forEach(r => existingCids.add(r.trackId));

    console.log(`   Saved: ${existingResults.pins.length} total pins`);
  }

  console.log('\n=========================');
  console.log('📊 Pinning Complete!');
  console.log(`   New pins: ${totalPinned}`);
  console.log(`   Total pins: ${existingResults.pins.length}`);
  console.log(`   Results: ${RESULTS_FILE}`);
  console.log('=========================\n');
  console.log('Next: Run apply-ipfs-cids.ts to update MongoDB\n');
}

main().catch(console.error);
