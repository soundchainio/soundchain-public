/**
 * Standalone script to grandfather existing tracks with SCids
 *
 * Run with: npx ts-node scripts/grandfather-scids.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import models and services
import { SCidModel, SCidStatus } from '../src/models/SCid';
import { TrackModel } from '../src/models/Track';
import { SCidGenerator, ChainCode } from '../src/utils/SCidGenerator';

// Use production DocumentDB via SSH tunnel on port 27018
// Connection string from DATABASE_URL in .env.local
const MONGO_URL = process.env.DATABASE_URL || 'mongodb://localhost:27018/test?authSource=admin&tls=true&tlsAllowInvalidCertificates=true&retryWrites=false&directConnection=true';

interface GrandfatherResult {
  totalTracks: number;
  tracksWithoutScid: number;
  registered: number;
  skipped: number;
  nftTracks: number;
  nonNftTracks: number;
  errors: string[];
}

async function grandfatherExistingTracks(): Promise<GrandfatherResult> {
  console.log('🚀 Starting SCid grandfather process for ALL existing tracks...\n');
  console.log(`📡 Connecting to MongoDB: ${MONGO_URL.includes('docdb') ? 'DocumentDB' : 'Local'}\n`);

  await mongoose.connect(MONGO_URL);
  console.log('✅ Connected to MongoDB\n');

  // Get all existing SCid trackIds
  const existingScids = await SCidModel.find().select('trackId').lean();
  const existingTrackIds = new Set(existingScids.map(s => s.trackId.toString()));
  console.log(`📊 Found ${existingScids.length} existing SCids\n`);

  // Find ALL tracks
  const allTracks = await TrackModel.find().lean();
  console.log(`📊 Found ${allTracks.length} total tracks\n`);

  // Filter tracks that don't have SCids
  const tracksWithoutScid = allTracks.filter(t => !existingTrackIds.has(t._id.toString()));
  console.log(`🎯 ${tracksWithoutScid.length} tracks need SCids\n`);

  let registered = 0;
  let nftTracks = 0;
  let nonNftTracks = 0;
  const errors: string[] = [];

  // Process in batches for performance
  const batchSize = 100;
  const totalBatches = Math.ceil(tracksWithoutScid.length / batchSize);

  for (let i = 0; i < tracksWithoutScid.length; i += batchSize) {
    const batch = tracksWithoutScid.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} tracks)...`);

    for (const track of batch) {
      try {
        const trackId = track._id.toString();
        const profileId = track.profileId?.toString();

        if (!profileId) {
          errors.push(`Track ${trackId}: No profile ID`);
          continue;
        }

        // Determine chain and type
        const isNft = track.nftData?.tokenId != null;
        const chainCode = ChainCode.POLYGON;

        if (isNft) {
          nftTracks++;
        } else {
          nonNftTracks++;
        }

        // Generate SCid - ensure profileId is valid
        if (!profileId || typeof profileId !== 'string' || profileId.length < 12) {
          errors.push(`Track ${trackId}: Invalid profile ID: ${profileId}`);
          continue;
        }
        const artistHash = SCidGenerator.generateArtistHash(profileId);
        const year = SCidGenerator.formatYear();

        // Get next sequence
        const latestScid = await SCidModel.findOne({ artistHash, year }).sort({ sequence: -1 }).lean();
        const sequence = latestScid ? latestScid.sequence + 1 : 1;

        // Generate the SCid string
        const scid = SCidGenerator.generate({
          chainCode,
          artistIdentifier: profileId,
          sequenceNumber: sequence,
        });

        // Create SCid record (cast to any to bypass mongoose auto-fields)
        await SCidModel.create({
          scid,
          trackId,
          profileId,
          chainCode,
          artistHash,
          year,
          sequence,
          status: SCidStatus.PENDING,
          walletAddress: track.nftData?.minter || track.nftData?.owner || undefined,
          streamCount: 0,
          ogunRewardsEarned: 0,
          dailyOgunEarned: 0,
          ogunRewardsClaimed: 0,
          transferHistory: [],
        } as any);

        registered++;

        // Log progress every 50 tracks
        if (registered % 50 === 0) {
          console.log(`   ✅ Registered ${registered} SCids so far...`);
        }
      } catch (err: any) {
        errors.push(`Track ${track._id}: ${err.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 GRANDFATHER COMPLETE!\n');
  console.log(`📊 Results:`);
  console.log(`   Total Tracks:       ${allTracks.length}`);
  console.log(`   Already Had SCids:  ${existingScids.length}`);
  console.log(`   Newly Registered:   ${registered}`);
  console.log(`   NFT Tracks:         ${nftTracks}`);
  console.log(`   Non-NFT Tracks:     ${nonNftTracks}`);
  console.log(`   Errors:             ${errors.length}`);
  console.log('='.repeat(60) + '\n');

  if (errors.length > 0 && errors.length <= 20) {
    console.log('⚠️ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
  } else if (errors.length > 20) {
    console.log(`⚠️ ${errors.length} errors (showing first 20):`);
    errors.slice(0, 20).forEach(e => console.log(`   - ${e}`));
  }

  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');

  return {
    totalTracks: allTracks.length,
    tracksWithoutScid: tracksWithoutScid.length,
    registered,
    skipped: existingScids.length,
    nftTracks,
    nonNftTracks,
    errors,
  };
}

// Run the script
grandfatherExistingTracks()
  .then(result => {
    console.log('\n📋 Exporting results to CSV...');
    // Could add CSV export here
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
