/**
 * Migration: Pinata CIDs Final
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');

async function fetchFromS3() {
  const client = new S3Client({ region: 'us-east-1' });
  const cmd = new GetObjectCommand({
    Bucket: 'soundchain-api-production-uploads',
    Key: 'migrations/ipfs_pins.json'
  });
  const resp = await client.send(cmd);
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

module.exports = {
  async up(db) {
    console.log('=== PINATA CID MIGRATION START ===');

    const { pins } = await fetchFromS3();
    console.log('Pins loaded:', pins.length);

    const coll = db.collection('tracks');
    const total = await coll.countDocuments();
    console.log('DB tracks:', total);

    // Sample from DB
    const dbSample = await coll.find({}).limit(2).toArray();
    console.log('DB track _id types:', dbSample.map(t => `${t._id} (${typeof t._id})`));

    // Check one pin
    const pin1 = pins[0];
    console.log('First pin trackId:', pin1.trackId, 'type:', typeof pin1.trackId);

    const found = await coll.findOne({ _id: new ObjectId(pin1.trackId) });
    console.log('Found first track?', found ? `YES: ${found.title}` : 'NO');

    // Count existing IPFS
    const existingIpfs = await coll.countDocuments({ ipfsCid: { $exists: true, $ne: null } });
    console.log('Tracks with existing IPFS CID:', existingIpfs);

    // Do updates
    let matched = 0, modified = 0;
    const batch = 500;

    for (let i = 0; i < pins.length; i += batch) {
      const ops = pins.slice(i, i + batch).map(p => ({
        updateOne: {
          filter: { _id: new ObjectId(p.trackId) },
          update: { $set: { ipfsCid: p.ipfsCid, ipfsGatewayUrl: p.ipfsGatewayUrl } }
        }
      }));
      const res = await coll.bulkWrite(ops, { ordered: false });
      matched += res.matchedCount;
      modified += res.modifiedCount;
      console.log(`Batch ${Math.floor(i/batch)+1}: match=${res.matchedCount} mod=${res.modifiedCount}`);
    }

    console.log('TOTAL: matched=' + matched + ' modified=' + modified);

    const finalIpfs = await coll.countDocuments({ ipfsCid: { $exists: true, $ne: null } });
    console.log('Final tracks with IPFS:', finalIpfs);
    console.log('=== PINATA CID MIGRATION END ===');
  },

  async down(db) {
    await db.collection('tracks').updateMany({}, { $unset: { ipfsCid: '', ipfsGatewayUrl: '' } });
  }
};
