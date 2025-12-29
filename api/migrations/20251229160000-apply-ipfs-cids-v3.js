/**
 * Migration: Apply IPFS CIDs to Tracks (v3)
 *
 * Final version with full diagnostics.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');

const BUCKET = 'soundchain-api-production-uploads';
const KEY = 'migrations/ipfs_pins.json';

async function fetchFromS3() {
  const client = new S3Client({ region: 'us-east-1' });
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: KEY });
  const response = await client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(data);
}

module.exports = {
  async up(db) {
    console.log('Starting IPFS CID migration v3...');

    const { pins } = await fetchFromS3();
    console.log(`Loaded ${pins.length} pins from S3`);

    const tracksCollection = db.collection('tracks');

    // Check total tracks in DB
    const totalTracks = await tracksCollection.countDocuments();
    console.log(`Total tracks in database: ${totalTracks}`);

    // Get sample of existing track IDs to understand format
    const sampleTracks = await tracksCollection.find({}).limit(3).toArray();
    console.log('Sample existing track IDs:', sampleTracks.map(t => ({
      id: t._id.toString(),
      type: typeof t._id,
      title: t.title
    })));

    // Get sample pin IDs
    const samplePins = pins.slice(0, 3);
    console.log('Sample pin track IDs:', samplePins.map(p => ({
      id: p.trackId,
      type: typeof p.trackId,
      title: p.title
    })));

    // Try finding first track by ObjectId
    const firstPinId = pins[0].trackId;
    console.log(`Looking for track ${firstPinId}...`);

    try {
      const foundById = await tracksCollection.findOne({ _id: new ObjectId(firstPinId) });
      console.log(`Found by ObjectId: ${foundById ? 'YES - ' + foundById.title : 'NO'}`);
    } catch (e) {
      console.log(`ObjectId error: ${e.message}`);
    }

    // Count tracks that already have IPFS CID
    const withIpfs = await tracksCollection.countDocuments({ ipfsCid: { $exists: true, $ne: null } });
    console.log(`Tracks already with IPFS CID: ${withIpfs}`);

    // Now do the updates
    const bulkOps = pins.map(pin => ({
      updateOne: {
        filter: { _id: new ObjectId(pin.trackId) },
        update: {
          $set: {
            ipfsCid: pin.ipfsCid,
            ipfsGatewayUrl: pin.ipfsGatewayUrl,
          },
        },
      },
    }));

    const batchSize = 1000;
    let totalMatched = 0;
    let totalModified = 0;

    for (let i = 0; i < bulkOps.length; i += batchSize) {
      const batch = bulkOps.slice(i, i + batchSize);
      const result = await tracksCollection.bulkWrite(batch, { ordered: false });
      totalMatched += result.matchedCount;
      totalModified += result.modifiedCount;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bulkOps.length / batchSize)}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    }

    console.log(`Migration complete: matched=${totalMatched}, modified=${totalModified}`);

    // Final verify
    const afterIpfs = await tracksCollection.countDocuments({ ipfsCid: { $exists: true, $ne: null } });
    console.log(`Tracks with IPFS CID after migration: ${afterIpfs}`);
  },

  async down(db) {
    await db.collection('tracks').updateMany(
      { ipfsCid: { $exists: true } },
      { $unset: { ipfsCid: '', ipfsGatewayUrl: '' } }
    );
    console.log('Rolled back: Removed IPFS CIDs from tracks');
  },
};
