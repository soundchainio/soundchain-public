/**
 * Migration: Fix IPFS CIDs
 * Unique timestamp to ensure it runs.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');

async function fetchPinsFromS3() {
  console.log('Fetching pins from S3...');
  const client = new S3Client({ region: 'us-east-1' });
  const command = new GetObjectCommand({
    Bucket: 'soundchain-api-production-uploads',
    Key: 'migrations/ipfs_pins.json'
  });
  const response = await client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  console.log('S3 fetch complete');
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

module.exports = {
  async up(db) {
    console.log('=== FIX IPFS MIGRATION START ===');

    const { pins } = await fetchPinsFromS3();
    console.log('Total pins:', pins.length);

    const tracks = db.collection('tracks');

    // Check database state
    const totalTracks = await tracks.countDocuments();
    console.log('Total tracks in DB:', totalTracks);

    // Sample track to understand ID format
    const sampleTrack = await tracks.findOne({});
    if (sampleTrack) {
      console.log('Sample track _id type:', typeof sampleTrack._id, sampleTrack._id.toString());
    }

    // Check existing IPFS data
    const withIpfs = await tracks.countDocuments({ ipfsCid: { $exists: true, $ne: null, $ne: '' } });
    console.log('Tracks already with IPFS CID:', withIpfs);

    // Try to find first pin's track
    const firstPin = pins[0];
    console.log('First pin trackId:', firstPin.trackId, 'title:', firstPin.title);

    const foundTrack = await tracks.findOne({ _id: new ObjectId(firstPin.trackId) });
    console.log('First track found?', foundTrack ? 'YES - ' + foundTrack.title : 'NO');

    // Apply updates in batches
    let matched = 0;
    let modified = 0;
    const batchSize = 500;

    for (let i = 0; i < pins.length; i += batchSize) {
      const batch = pins.slice(i, i + batchSize);
      const ops = batch.map(pin => ({
        updateOne: {
          filter: { _id: new ObjectId(pin.trackId) },
          update: {
            $set: {
              ipfsCid: pin.ipfsCid,
              ipfsGatewayUrl: pin.ipfsGatewayUrl
            }
          }
        }
      }));

      const result = await tracks.bulkWrite(ops, { ordered: false });
      matched += result.matchedCount;
      modified += result.modifiedCount;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    }

    console.log('=== TOTALS: matched=' + matched + ', modified=' + modified + ' ===');

    // Verify
    const finalWithIpfs = await tracks.countDocuments({ ipfsCid: { $exists: true, $ne: null, $ne: '' } });
    console.log('Tracks with IPFS after migration:', finalWithIpfs);

    console.log('=== FIX IPFS MIGRATION END ===');
    return matched;
  },

  async down(db) {
    console.log('Rolling back IPFS CIDs...');
    await db.collection('tracks').updateMany(
      { ipfsCid: { $exists: true } },
      { $unset: { ipfsCid: '', ipfsGatewayUrl: '' } }
    );
    console.log('Rollback complete');
  }
};
