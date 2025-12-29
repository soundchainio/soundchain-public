/**
 * Migration: IPFS CIDs for Production
 * Runs against the 'test' database where tracks actually live.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');

async function fetchPins() {
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
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

module.exports = {
  async up(db) {
    console.log('=== IPFS CIDs PRODUCTION MIGRATION ===');

    // Verify we're in the right database
    const colls = await db.listCollections().toArray();
    console.log('Database collections:', colls.map(c => c.name));

    const tracks = db.collection('tracks');
    const trackCount = await tracks.countDocuments();
    console.log('Total tracks:', trackCount);

    if (trackCount === 0) {
      console.log('ERROR: No tracks in database! Wrong database?');
      return 0;
    }

    const { pins } = await fetchPins();
    console.log('Pins loaded:', pins.length);

    // Verify first pin matches a track
    const sampleTrack = await tracks.findOne({ _id: new ObjectId(pins[0].trackId) });
    console.log('First pin matches track?', sampleTrack ? sampleTrack.title : 'NO');

    // Check existing IPFS data
    const existingIpfs = await tracks.countDocuments({ ipfsCid: { $exists: true, $ne: null, $ne: '' } });
    console.log('Tracks with existing IPFS:', existingIpfs);

    // Apply updates
    let matched = 0, modified = 0;
    const batchSize = 500;

    for (let i = 0; i < pins.length; i += batchSize) {
      const batch = pins.slice(i, i + batchSize);
      const ops = batch.map(pin => ({
        updateOne: {
          filter: { _id: new ObjectId(pin.trackId) },
          update: { $set: { ipfsCid: pin.ipfsCid, ipfsGatewayUrl: pin.ipfsGatewayUrl } }
        }
      }));

      const result = await tracks.bulkWrite(ops, { ordered: false });
      matched += result.matchedCount;
      modified += result.modifiedCount;

      if ((i / batchSize) % 2 === 0) {
        console.log(`Progress: ${i + batch.length}/${pins.length} - matched=${matched}, modified=${modified}`);
      }
    }

    console.log('=== FINAL: matched=' + matched + ', modified=' + modified + ' ===');

    const afterIpfs = await tracks.countDocuments({ ipfsCid: { $exists: true, $ne: null, $ne: '' } });
    console.log('Tracks with IPFS after:', afterIpfs);

    return matched;
  },

  async down(db) {
    await db.collection('tracks').updateMany({}, { $unset: { ipfsCid: '', ipfsGatewayUrl: '' } });
    console.log('IPFS CIDs removed');
  }
};
