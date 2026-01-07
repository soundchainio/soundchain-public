/**
 * Grandfather OG Rewards Script
 *
 * Credits retroactive OGUN rewards to all creators based on their
 * historical playbackCount data from 2022-2026.
 *
 * This rewards the OG users who've been on the platform since the beginning!
 *
 * Rewards are added as CLAIMABLE BALANCE (ogunRewardsEarned - ogunRewardsClaimed)
 */

import mongoose from 'mongoose';
import { TrackModel } from '../models/Track';
import { SCidModel } from '../models/SCid';
import { ProfileModel } from '../models/Profile';
import { ChainCode, SCidGenerator } from '../utils/SCidGenerator';
import dotenv from 'dotenv';

dotenv.config();

// WIN-WIN reward rates (creator's 70% share)
const OG_REWARD_CONFIG = {
  // NFT tracks: 0.5 OGUN total, creator gets 70% = 0.35 per stream
  nftRewardPerPlay: 0.35,
  // Non-NFT tracks: 0.05 OGUN total, creator gets 70% = 0.035 per stream
  baseRewardPerPlay: 0.035,
  // Cap per track to prevent abuse (even for OGs)
  maxRewardPerTrack: 10000, // 10k OGUN max per track
};

interface GrandfatherResult {
  totalTracksProcessed: number;
  totalPlaysRewarded: number;
  totalOgunCredited: number;
  nftTracksRewarded: number;
  nonNftTracksRewarded: number;
  creatorsRewarded: number;
  trackDetails: Array<{
    trackId: string;
    title: string;
    profileId: string;
    playbackCount: number;
    isNft: boolean;
    ogunCredited: number;
  }>;
  errors: string[];
}

export async function grandfatherOGRewards(options: {
  dryRun?: boolean;
  limit?: number;
  minPlays?: number;
}): Promise<GrandfatherResult> {
  const { dryRun = true, limit = 0, minPlays = 1 } = options;

  console.log('\n========================================');
  console.log('   GRANDFATHER OG REWARDS SCRIPT');
  console.log('   Rewarding the Pioneers!');
  console.log('========================================\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '🚀 LIVE RUN (will credit rewards)'}`);
  console.log(`Min plays threshold: ${minPlays}`);
  console.log(`Limit: ${limit || 'No limit'}\n`);

  const result: GrandfatherResult = {
    totalTracksProcessed: 0,
    totalPlaysRewarded: 0,
    totalOgunCredited: 0,
    nftTracksRewarded: 0,
    nonNftTracksRewarded: 0,
    creatorsRewarded: 0,
    trackDetails: [],
    errors: [],
  };

  const creatorsSet = new Set<string>();

  try {
    // Find all tracks with plays
    const query: any = {
      playbackCount: { $gte: minPlays },
      deleted: { $ne: true }
    };

    let tracksQuery = TrackModel.find(query).sort({ playbackCount: -1 });
    if (limit > 0) {
      tracksQuery = tracksQuery.limit(limit);
    }

    const tracks = await tracksQuery.lean().exec();
    console.log(`Found ${tracks.length} tracks with ${minPlays}+ plays\n`);

    for (const track of tracks) {
      try {
        const trackId = track._id.toString();
        const profileId = track.profileId?.toString();
        const playbackCount = track.playbackCount || 0;
        const isNft = !!(track.nftData?.tokenId || track.nftData?.contract);

        if (!profileId) {
          result.errors.push(`Track ${trackId} has no profileId`);
          continue;
        }

        // Calculate reward based on NFT status
        const rewardPerPlay = isNft ? OG_REWARD_CONFIG.nftRewardPerPlay : OG_REWARD_CONFIG.baseRewardPerPlay;
        let ogunToCredit = playbackCount * rewardPerPlay;

        // Apply cap
        ogunToCredit = Math.min(ogunToCredit, OG_REWARD_CONFIG.maxRewardPerTrack);

        // Get or create SCid for this track
        let scid = await SCidModel.findOne({ trackId }).lean();

        if (!scid && !dryRun) {
          // Need to create SCid for this track
          const profile = await ProfileModel.findById(profileId);
          const artistIdentifier = profile?.displayName || profileId;

          // Count existing SCids for sequence
          const existingCount = await SCidModel.countDocuments({ profileId });

          const scidCode = SCidGenerator.generate({
            artistIdentifier,
            sequenceNumber: existingCount + 1,
            chainCode: ChainCode.POLYGON,
          });

          const newScid = new SCidModel({
            scid: scidCode,
            trackId,
            profileId,
            chainCode: ChainCode.POLYGON,
            artistHash: SCidGenerator.parse(scidCode).components?.artistHash || '',
            year: new Date().getFullYear().toString().slice(-2),
            sequence: existingCount + 1,
            status: 'PENDING',
            streamCount: playbackCount, // Credit historical plays as streams
            ogunRewardsEarned: ogunToCredit,
            ogunRewardsClaimed: 0,
          });

          await newScid.save();
          console.log(`✨ Created new SCid for track: ${track.title}`);
        } else if (scid && !dryRun) {
          // Update existing SCid with grandfather rewards
          await SCidModel.updateOne(
            { trackId },
            {
              $inc: {
                streamCount: playbackCount, // Add historical plays to stream count
                ogunRewardsEarned: ogunToCredit, // Add to claimable balance
              },
            }
          );
        }

        // Track stats
        result.totalTracksProcessed++;
        result.totalPlaysRewarded += playbackCount;
        result.totalOgunCredited += ogunToCredit;

        if (isNft) {
          result.nftTracksRewarded++;
        } else {
          result.nonNftTracksRewarded++;
        }

        creatorsSet.add(profileId);

        result.trackDetails.push({
          trackId,
          title: track.title || 'Untitled',
          profileId,
          playbackCount,
          isNft,
          ogunCredited: ogunToCredit,
        });

        // Log progress
        const nftBadge = isNft ? '🎵 NFT' : '🎶';
        console.log(`${nftBadge} "${track.title}" - ${playbackCount.toLocaleString()} plays → +${ogunToCredit.toFixed(2)} OGUN`);

      } catch (trackError: any) {
        result.errors.push(`Track ${track._id}: ${trackError.message}`);
        console.error(`❌ Error processing track ${track._id}:`, trackError.message);
      }
    }

    result.creatorsRewarded = creatorsSet.size;

    // Summary
    console.log('\n========================================');
    console.log('   GRANDFATHER REWARDS SUMMARY');
    console.log('========================================');
    console.log(`📊 Tracks Processed: ${result.totalTracksProcessed}`);
    console.log(`🎵 NFT Tracks: ${result.nftTracksRewarded}`);
    console.log(`🎶 Non-NFT Tracks: ${result.nonNftTracksRewarded}`);
    console.log(`▶️  Total Plays Rewarded: ${result.totalPlaysRewarded.toLocaleString()}`);
    console.log(`💰 Total OGUN Credited: ${result.totalOgunCredited.toLocaleString()} OGUN`);
    console.log(`👥 Unique Creators Rewarded: ${result.creatorsRewarded}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log('========================================\n');

    if (dryRun) {
      console.log('🔍 DRY RUN COMPLETE - No changes made');
      console.log('Run with dryRun=false to apply rewards\n');
    } else {
      console.log('🚀 REWARDS CREDITED SUCCESSFULLY!');
      console.log('OG users can now claim their rewards!\n');
    }

    return result;

  } catch (error: any) {
    console.error('Fatal error in grandfather script:', error);
    result.errors.push(`Fatal: ${error.message}`);
    return result;
  }
}

// CLI runner
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;
  const minPlaysArg = args.find(a => a.startsWith('--min-plays='));
  const minPlays = minPlaysArg ? parseInt(minPlaysArg.split('=')[1]) : 1;

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected!\n');

  const result = await grandfatherOGRewards({ dryRun, limit, minPlays });

  // Output top 10 rewarded tracks
  console.log('\n🏆 TOP 10 REWARDED TRACKS:');
  result.trackDetails
    .sort((a, b) => b.ogunCredited - a.ogunCredited)
    .slice(0, 10)
    .forEach((track, i) => {
      console.log(`${i + 1}. "${track.title}" - ${track.ogunCredited.toFixed(2)} OGUN (${track.playbackCount.toLocaleString()} plays)`);
    });

  await mongoose.disconnect();
  console.log('\nDone!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default grandfatherOGRewards;
