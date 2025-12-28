/**
 * Mux to IPFS Migration Script (Local Files)
 *
 * This script migrates exported Mux audio files to Pinata/IPFS.
 * It reads local MP4 files from mux_exported/ directory and pins to IPFS.
 *
 * Workflow:
 * 1. Run export-mux-assets.ts to get metadata
 * 2. Run download-mux-streams.ts to download MP4s from HLS
 * 3. Run this script to pin local MP4s to Pinata/IPFS
 *
 * Prerequisites:
 * - mux_exported/ directory with audio.mp4 files
 * - PINATA_API_KEY and PINATA_API_SECRET in .env.local
 *
 * Usage: npx ts-node src/scripts/migrate-to-ipfs.ts [options]
 *
 * Options:
 *   --dry-run     Preview what would be migrated
 *   --limit=N     Only process N tracks
 *   --skip=N      Skip first N tracks
 *   --track=ID    Migrate specific track ID
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import pinataClient from '@pinata/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
const PINATA_DEDICATED_GATEWAY = process.env.PINATA_DEDICATED_GATEWAY;

// Use MongoDB connection from .env.local
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

const EXPORT_DIR = path.join(__dirname, '..', '..', '..', 'mux_exported');

interface MigrationResult {
  trackId: string;
  title: string;
  ipfsCid?: string;
  ipfsGatewayUrl?: string;
  pinSize?: number;
  status: 'success' | 'skipped' | 'error';
  error?: string;
}

interface MigrationReport {
  startTime: string;
  endTime?: string;
  totalTracks: number;
  migrated: number;
  skipped: number;
  failed: number;
  results: MigrationResult[];
}

interface ExportedMetadata {
  trackId: string;
  title: string;
  artist: string;
  muxAssetId: string;
  playbackId: string;
  hlsUrl: string;
  mp4Url?: string;
  duration: number;
  exportedAt: string;
}

// Track schema for updating
const TrackSchema = new mongoose.Schema({
  title: String,
  artist: String,
  ipfsCid: String,
  ipfsGatewayUrl: String,
  muxAsset: {
    id: String,
    playbackId: String,
  },
  deleted: Boolean,
}, { collection: 'tracks', strict: false });

const Track = mongoose.model('Track', TrackSchema);

// Parse command line arguments
function parseArgs(): { dryRun: boolean; limit?: number; skip?: number; trackId?: string } {
  const args = process.argv.slice(2);
  const options: any = { dryRun: false };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--skip=')) {
      options.skip = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--track=')) {
      options.trackId = arg.split('=')[1];
    }
  }

  return options;
}

// Get the best gateway URL for a CID
function getGatewayUrl(cid: string): string {
  if (PINATA_DEDICATED_GATEWAY) {
    return `${PINATA_DEDICATED_GATEWAY}/${cid}`;
  }
  return `${PINATA_GATEWAY}/${cid}`;
}

async function migrateToIPFS() {
  const options = parseArgs();

  console.log('🚀 SoundChain Mux → IPFS Migration Script');
  console.log('==========================================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Validate Pinata credentials
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ PINATA_API_KEY and PINATA_API_SECRET must be set in .env.local');
    process.exit(1);
  }

  // Check if export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.error('   Run export-mux-assets.ts first to download Mux files');
    process.exit(1);
  }

  const report: MigrationReport = {
    startTime: new Date().toISOString(),
    totalTracks: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  try {
    // Initialize Pinata client
    console.log('📌 Connecting to Pinata...');
    const pinata = pinataClient(PINATA_API_KEY, PINATA_API_SECRET);

    // Test Pinata connection
    const pinataAuth = await pinata.testAuthentication();
    console.log('✅ Pinata authenticated\n');

    // Connect to MongoDB
    console.log('🗄️  Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get list of exported track folders
    let trackFolders = fs.readdirSync(EXPORT_DIR)
      .filter(f => {
        const stat = fs.statSync(path.join(EXPORT_DIR, f));
        return stat.isDirectory() && f !== '_orphans';
      });

    // Filter by specific track if requested
    if (options.trackId) {
      trackFolders = trackFolders.filter(f => f === options.trackId);
      if (trackFolders.length === 0) {
        console.error(`❌ Track not found in exports: ${options.trackId}`);
        process.exit(1);
      }
    }

    // Apply skip and limit
    if (options.skip) {
      trackFolders = trackFolders.slice(options.skip);
    }
    if (options.limit) {
      trackFolders = trackFolders.slice(0, options.limit);
    }

    console.log(`📋 Found ${trackFolders.length} tracks to process\n`);
    report.totalTracks = trackFolders.length;

    // Process each track
    let processed = 0;
    for (const trackId of trackFolders) {
      processed++;
      const trackFolder = path.join(EXPORT_DIR, trackId);
      const metadataPath = path.join(trackFolder, 'metadata.json');
      const audioPath = path.join(trackFolder, 'audio.mp4');

      console.log(`[${processed}/${trackFolders.length}] Processing track: ${trackId}`);

      const result: MigrationResult = {
        trackId,
        title: 'Unknown',
        status: 'error',
      };

      try {
        // Read metadata
        if (!fs.existsSync(metadataPath)) {
          result.status = 'skipped';
          result.error = 'No metadata.json found';
          console.log(`  ⏭️  Skipped: No metadata.json`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        const metadata: ExportedMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        result.title = metadata.title || 'Untitled';

        // Check if already migrated
        const existingTrack = await Track.findById(trackId).lean();
        if (existingTrack?.ipfsCid) {
          result.status = 'skipped';
          result.error = `Already has IPFS CID: ${existingTrack.ipfsCid}`;
          result.ipfsCid = existingTrack.ipfsCid;
          console.log(`  ⏭️  Skipped: Already migrated (${existingTrack.ipfsCid.slice(0, 12)}...)`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        // Check if audio file exists
        if (!fs.existsSync(audioPath)) {
          result.status = 'skipped';
          result.error = 'No audio.mp4 file found';
          console.log(`  ⏭️  Skipped: No audio.mp4 file`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        // Get file stats
        const stats = fs.statSync(audioPath);
        console.log(`  📁 File: ${metadata.title} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        if (options.dryRun) {
          result.status = 'skipped';
          result.error = 'Dry run - not pinned';
          console.log(`  🔍 Would pin to IPFS: ${metadata.title}`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        // Pin to IPFS
        console.log(`  📌 Pinning to IPFS...`);
        const fileName = `${(metadata.title || 'track').replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

        const readableStreamForFile = fs.createReadStream(audioPath);
        const pinResult = await pinata.pinFileToIPFS(readableStreamForFile, {
          pinataMetadata: {
            name: fileName,
            keyvalues: {
              trackId: trackId,
              type: 'audio',
              platform: 'soundchain',
              migratedFromMux: 'true',
              originalMuxId: metadata.muxAssetId || 'unknown',
            } as any,
          },
          pinataOptions: {
            cidVersion: 1,
          },
        });

        const ipfsCid = pinResult.IpfsHash;
        const ipfsGatewayUrl = getGatewayUrl(ipfsCid);

        console.log(`  ✅ Pinned! CID: ${ipfsCid}`);
        console.log(`  🔗 Gateway: ${ipfsGatewayUrl}`);

        // Update track in database
        console.log(`  💾 Updating database...`);
        await Track.updateOne(
          { _id: new mongoose.Types.ObjectId(trackId) },
          {
            $set: {
              ipfsCid: ipfsCid,
              ipfsGatewayUrl: ipfsGatewayUrl,
            },
          }
        );

        result.status = 'success';
        result.ipfsCid = ipfsCid;
        result.ipfsGatewayUrl = ipfsGatewayUrl;
        result.pinSize = pinResult.PinSize;
        report.migrated++;
        console.log(`  ✅ Migration complete!\n`);

      } catch (err: any) {
        result.status = 'error';
        result.error = err.message;
        report.failed++;
        console.log(`  ❌ Error: ${err.message}\n`);
      }

      report.results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    report.endTime = new Date().toISOString();

    // Save migration report
    const reportPath = path.join(EXPORT_DIR, 'migration_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('==========================================');
    console.log('📊 Migration Complete!');
    console.log(`   Total Tracks: ${report.totalTracks}`);
    console.log(`   Migrated: ${report.migrated}`);
    console.log(`   Skipped: ${report.skipped}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Report: ${reportPath}`);
    console.log('==========================================\n');

    if (report.migrated > 0) {
      console.log('🎉 Success! Your tracks are now streaming from IPFS/Pinata!');
      console.log('   The playbackUrl resolver will automatically use IPFS CIDs.\n');
    }

  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    report.endTime = new Date().toISOString();
    fs.writeFileSync(path.join(EXPORT_DIR, 'migration_report.json'), JSON.stringify(report, null, 2));
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the migration
migrateToIPFS().catch(console.error);
