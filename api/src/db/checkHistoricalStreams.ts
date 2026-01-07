/**
 * Check Historical Streams
 * Quick script to see total playbackCount in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkHistoricalStreams() {
  const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI || '';

  console.log('Connecting to MongoDB...');
  console.log('URI prefix:', mongoUri.substring(0, 30) + '...');

  await mongoose.connect(mongoUri);
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const tracksCollection = db.collection('tracks');

  // Get total tracks
  const totalTracks = await tracksCollection.countDocuments();
  console.log(`📊 Total Tracks in DB: ${totalTracks.toLocaleString()}`);

  // Get tracks with plays
  const tracksWithPlays = await tracksCollection.countDocuments({ playbackCount: { $gt: 0 } });
  console.log(`🎵 Tracks with Plays: ${tracksWithPlays.toLocaleString()}`);

  // Sum all playbackCount
  const result = await tracksCollection.aggregate([
    { $group: { _id: null, totalPlays: { $sum: '$playbackCount' } } }
  ]).toArray();

  const totalPlays = result[0]?.totalPlays || 0;
  console.log(`▶️  Total Historical Plays: ${totalPlays.toLocaleString()}`);

  // Get NFT tracks with plays
  const nftTracksWithPlays = await tracksCollection.countDocuments({
    playbackCount: { $gt: 0 },
    $or: [
      { 'nftData.tokenId': { $exists: true } },
      { 'nftData.contractAddress': { $exists: true } }
    ]
  });
  console.log(`🎵 NFT Tracks with Plays: ${nftTracksWithPlays.toLocaleString()}`);

  // Sum NFT plays
  const nftResult = await tracksCollection.aggregate([
    {
      $match: {
        playbackCount: { $gt: 0 },
        $or: [
          { 'nftData.tokenId': { $exists: true } },
          { 'nftData.contractAddress': { $exists: true } }
        ]
      }
    },
    { $group: { _id: null, totalPlays: { $sum: '$playbackCount' } } }
  ]).toArray();

  const nftPlays = nftResult[0]?.totalPlays || 0;
  console.log(`▶️  NFT Track Plays: ${nftPlays.toLocaleString()}`);

  // Calculate potential OGUN rewards
  const nonNftPlays = totalPlays - nftPlays;
  const nftOgun = nftPlays * 0.35; // Creator's 70% of 0.5 OGUN
  const nonNftOgun = nonNftPlays * 0.035; // Creator's 70% of 0.05 OGUN
  const totalOgun = nftOgun + nonNftOgun;

  console.log('\n========================================');
  console.log('   GRANDFATHER OGUN CALCULATION');
  console.log('========================================');
  console.log(`💰 NFT Plays OGUN: ${nftOgun.toLocaleString()} OGUN`);
  console.log(`💰 Non-NFT Plays OGUN: ${nonNftOgun.toLocaleString()} OGUN`);
  console.log(`💰 TOTAL CREATOR OGUN: ${totalOgun.toLocaleString()} OGUN`);
  console.log('========================================\n');

  // Top 10 most played tracks
  console.log('🏆 TOP 10 MOST PLAYED TRACKS:');
  const topTracks = await tracksCollection
    .find({ playbackCount: { $gt: 0 } })
    .sort({ playbackCount: -1 })
    .limit(10)
    .toArray();

  topTracks.forEach((track, i) => {
    const isNft = track.nftData?.tokenId || track.nftData?.contractAddress;
    const badge = isNft ? '🎵 NFT' : '🎶';
    console.log(`${i + 1}. ${badge} "${track.title}" - ${track.playbackCount?.toLocaleString() || 0} plays`);
  });

  // Unique creators
  const uniqueCreators = await tracksCollection.aggregate([
    { $match: { playbackCount: { $gt: 0 } } },
    { $group: { _id: '$profileId' } },
    { $count: 'count' }
  ]).toArray();

  console.log(`\n👥 Unique Creators with Plays: ${uniqueCreators[0]?.count || 0}`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkHistoricalStreams().catch(console.error);
