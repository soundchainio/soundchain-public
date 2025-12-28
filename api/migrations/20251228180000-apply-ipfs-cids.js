/**
 * Migration: Apply IPFS CIDs to Tracks
 *
 * This migration reads ipfs_pins.json from S3 and updates all tracks
 * with their IPFS CIDs for decentralized streaming.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');

const BUCKET = 'soundchain-api-production-uploads';
const KEY = 'migrations/ipfs_pins.json';

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

module.exports = {
  async up(db) {
    console.log('Starting IPFS CID migration...');

    // Fetch pins from S3
    const s3 = new S3Client({ region: 'us-east-1' });
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: KEY });
    const response = await s3.send(command);
    const data = await streamToString(response.Body);
    const { pins } = JSON.parse(data);

    console.log(`Loaded ${pins.length} pins from S3`);

    // Build bulk operations
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

    // Execute in batches of 1000
    const batchSize = 1000;
    let updated = 0;

    for (let i = 0; i < bulkOps.length; i += batchSize) {
      const batch = bulkOps.slice(i, i + batchSize);
      const result = await db.collection('tracks').bulkWrite(batch, { ordered: false });
      updated += result.modifiedCount;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bulkOps.length / batchSize)}: ${result.modifiedCount} updated`);
    }

    console.log(`Migration complete: ${updated} tracks updated with IPFS CIDs`);
  },

  async down(db) {
    // Remove IPFS fields from all tracks
    await db.collection('tracks').updateMany(
      { ipfsCid: { $exists: true } },
      { $unset: { ipfsCid: '', ipfsGatewayUrl: '' } }
    );
    console.log('Rolled back: Removed IPFS CIDs from tracks');
  },
};
