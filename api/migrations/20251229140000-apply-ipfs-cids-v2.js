/**
 * Migration: Apply IPFS CIDs to Tracks (v2)
 *
 * Diagnostic version with more logging.
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
    console.log('Starting IPFS CID migration v2...');

    const { pins } = await fetchFromS3();
    console.log(`Loaded ${pins.length} pins from S3`);

    // First, check if any of these track IDs exist
    const sampleIds = pins.slice(0, 5).map(p => p.trackId);
    console.log('Sample track IDs:', sampleIds);

    // Try to find these tracks
    const tracksCollection = db.collection('tracks');

    // Check total tracks in DB
    const totalTracks = await tracksCollection.countDocuments();
    console.log(`Total tracks in database: ${totalTracks}`);

    // Try finding by string ID first
    const foundByString = await tracksCollection.find({ _id: { $in: sampleIds } }).toArray();
    console.log(`Found by string ID: ${foundByString.length}`);

    // Try finding by ObjectId
    const objectIds = sampleIds.map(id => {
      try {
        return new ObjectId(id);
      } catch (e) {
        console.log(`Invalid ObjectId: ${id}`);
        return null;
      }
    }).filter(Boolean);

    const foundByObjectId = await tracksCollection.find({ _id: { $in: objectIds } }).toArray();
    console.log(`Found by ObjectId: ${foundByObjectId.length}`);

    if (foundByObjectId.length > 0) {
      console.log('Sample found track:', {
        _id: foundByObjectId[0]._id.toString(),
        title: foundByObjectId[0].title,
        hasIpfsCid: !!foundByObjectId[0].ipfsCid
      });
    }

    // Check if tracks already have IPFS CIDs
    const withIpfs = await tracksCollection.countDocuments({ ipfsCid: { $exists: true, $ne: null } });
    console.log(`Tracks already with IPFS CID: ${withIpfs}`);

    // Now do the update using ObjectIds
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

    // Verify
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
