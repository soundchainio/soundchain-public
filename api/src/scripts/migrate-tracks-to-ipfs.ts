/**
 * Migrate Tracks to IPFS - Direct from S3
 *
 * This script migrates existing tracks to Pinata/IPFS by:
 * 1. Finding tracks that have muxAsset but no ipfsCid
 * 2. Pinning the original audio file from S3 to IPFS
 * 3. Updating the Track document with the IPFS CID
 *
 * Prerequisites:
 * - PINATA_API_KEY and PINATA_API_SECRET in .env.local
 * - AWS credentials configured for S3 access
 *
 * Usage: npx ts-node src/scripts/migrate-tracks-to-ipfs.ts [options]
 *
 * Options:
 *   --dry-run     Preview what would be migrated
 *   --limit=N     Only process N tracks
 *   --skip=N      Skip first N tracks
 *   --track=ID    Migrate specific track by ID
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import pinataClient from '@pinata/sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Load environment variables
dotenv.config({ path: '.env.local' });

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
const PINATA_DEDICATED_GATEWAY = process.env.PINATA_DEDICATED_GATEWAY;

const AWS_REGION = process.env.UPLOADS_BUCKET_REGION || 'us-east-1';
const AWS_BUCKET = process.env.UPLOADS_BUCKET_NAME || 'soundchain-api-develop-uploads';

// Production DocumentDB connection
const DB_USER = 'soundchainadmin';
const DB_PASS = encodeURIComponent('r.*[XQ8Y8p*FV0ffeP!tQal8EVC8');
const DB_HOST = 'localhost:27018';
const DB_NAME = 'test';
const MONGODB_URI = `mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?authSource=admin&tls=true&tlsAllowInvalidCertificates=true&directConnection=true`;

interface MigrationResult {
  trackId: string;
  title: string;
  ipfsCid?: string;
  ipfsGatewayUrl?: string;
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

// Track schema
const TrackSchema = new mongoose.Schema({
  title: String,
  artist: String,
  assetUrl: String,
  ipfsCid: String,
  ipfsGatewayUrl: String,
  muxAsset: {
    id: String,
    playbackId: String,
  },
  deleted: Boolean,
}, { collection: 'tracks', strict: false });

const Track = mongoose.model('Track', TrackSchema);

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const options: any = { dryRun: false };

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--skip=')) options.skip = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--track=')) options.trackId = arg.split('=')[1];
  }

  return options;
}

// Get gateway URL
function getGatewayUrl(cid: string): string {
  return PINATA_DEDICATED_GATEWAY
    ? `${PINATA_DEDICATED_GATEWAY}/${cid}`
    : `${PINATA_GATEWAY}/${cid}`;
}

// Extract S3 key from URL
function extractS3Key(assetUrl: string): string | null {
  try {
    const url = new URL(assetUrl);
    // Handle both path-style and virtual-hosted style URLs
    let key = url.pathname.replace(/^\//, '');

    // If the URL includes the bucket name in the path, remove it
    if (key.startsWith(AWS_BUCKET + '/')) {
      key = key.replace(AWS_BUCKET + '/', '');
    }

    return key || null;
  } catch {
    return null;
  }
}

async function migrateTracksToIPFS() {
  const options = parseArgs();

  console.log('🚀 SoundChain Track → IPFS Migration (Direct from S3)');
  console.log('======================================================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Validate credentials
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.error('❌ PINATA_API_KEY and PINATA_API_SECRET required in .env.local');
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
    // Initialize clients
    console.log('📌 Connecting to Pinata...');
    const pinata = pinataClient(PINATA_API_KEY, PINATA_API_SECRET);
    await pinata.testAuthentication();
    console.log('✅ Pinata authenticated\n');

    console.log('☁️  Initializing S3 client...');
    const s3Client = new S3Client({
      region: AWS_REGION,
      forcePathStyle: true,
    });
    console.log(`✅ S3 client ready (bucket: ${AWS_BUCKET})\n`);

    // Connect to MongoDB
    console.log('🗄️  Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      ssl: true,
      sslValidate: false,
      serverSelectionTimeoutMS: 30000,
    } as any);
    console.log('✅ Connected to MongoDB\n');

    // Build query for tracks to migrate
    const query: any = {
      'muxAsset.id': { $exists: true, $ne: null },
      ipfsCid: { $exists: false },
      assetUrl: { $exists: true, $ne: null },
      deleted: { $ne: true },
    };

    if (options.trackId) {
      query._id = new mongoose.Types.ObjectId(options.trackId);
    }

    // Get tracks to migrate
    let tracksQuery = Track.find(query).sort({ createdAt: -1 });

    if (options.skip) {
      tracksQuery = tracksQuery.skip(options.skip);
    }
    if (options.limit) {
      tracksQuery = tracksQuery.limit(options.limit);
    }

    const tracks = await tracksQuery.lean();
    console.log(`📋 Found ${tracks.length} tracks to migrate\n`);
    report.totalTracks = tracks.length;

    if (tracks.length === 0) {
      console.log('✅ No tracks need migration!');
      return;
    }

    // Process each track
    let processed = 0;
    for (const track of tracks) {
      processed++;
      const trackId = track._id.toString();

      console.log(`[${processed}/${tracks.length}] ${track.title || 'Untitled'} (${trackId})`);

      const result: MigrationResult = {
        trackId,
        title: track.title || 'Untitled',
        status: 'error',
      };

      try {
        // Extract S3 key from asset URL
        const s3Key = extractS3Key(track.assetUrl);
        if (!s3Key) {
          result.status = 'skipped';
          result.error = `Invalid assetUrl: ${track.assetUrl}`;
          console.log(`  ⏭️  Skipped: Invalid asset URL`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        console.log(`  📁 S3 Key: ${s3Key}`);

        if (options.dryRun) {
          result.status = 'skipped';
          result.error = 'Dry run';
          console.log(`  🔍 Would pin from S3: ${s3Key}`);
          report.skipped++;
          report.results.push(result);
          continue;
        }

        // Get file from S3
        console.log(`  ⬇️  Fetching from S3...`);
        const command = new GetObjectCommand({ Bucket: AWS_BUCKET, Key: s3Key });
        const s3Response = await s3Client.send(command);

        if (!s3Response.Body) {
          result.status = 'error';
          result.error = 'Empty S3 response';
          console.log(`  ❌ Error: Empty S3 response`);
          report.failed++;
          report.results.push(result);
          continue;
        }

        // Pin to IPFS
        console.log(`  📌 Pinning to IPFS...`);
        const fileName = `${(track.title || 'track').replace(/[^a-zA-Z0-9]/g, '_')}_${trackId}`;

        const pinResult = await pinata.pinFileToIPFS(s3Response.Body as Readable, {
          pinataMetadata: {
            name: fileName,
            keyvalues: {
              trackId: trackId,
              type: 'audio',
              platform: 'soundchain',
              migratedFromMux: 'true',
            } as any,
          },
          pinataOptions: {
            cidVersion: 1,
          },
        });

        const ipfsCid = pinResult.IpfsHash;
        const ipfsGatewayUrl = getGatewayUrl(ipfsCid);

        console.log(`  ✅ Pinned: ${ipfsCid}`);

        // Update database
        console.log(`  💾 Updating database...`);
        await Track.updateOne(
          { _id: new mongoose.Types.ObjectId(trackId) },
          { $set: { ipfsCid, ipfsGatewayUrl } }
        );

        result.status = 'success';
        result.ipfsCid = ipfsCid;
        result.ipfsGatewayUrl = ipfsGatewayUrl;
        report.migrated++;
        console.log(`  ✅ Complete!\n`);

      } catch (err: any) {
        result.status = 'error';
        result.error = err.message;
        report.failed++;
        console.log(`  ❌ Error: ${err.message}\n`);
      }

      report.results.push(result);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    report.endTime = new Date().toISOString();

    // Save report
    const reportDir = path.join(__dirname, '..', '..', '..', 'mux_exported');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportPath = path.join(reportDir, `ipfs_migration_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('======================================================');
    console.log('📊 Migration Complete!');
    console.log(`   Total: ${report.totalTracks}`);
    console.log(`   Migrated: ${report.migrated}`);
    console.log(`   Skipped: ${report.skipped}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Report: ${reportPath}`);
    console.log('======================================================\n');

  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run
migrateTracksToIPFS().catch(console.error);
