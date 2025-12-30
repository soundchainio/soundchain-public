const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

async function migrate() {
  const uri = 'mongodb://soundchain:soundchain@localhost:27018/soundchain?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false&directConnection=true';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to DocumentDB');

    const db = client.db('soundchain');
    const { pins } = JSON.parse(fs.readFileSync('/tmp/ipfs_pins.json', 'utf8'));
    console.log(`Loaded ${pins.length} pins from local file`);

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
  } finally {
    await client.close();
  }
}

migrate().catch(console.error);
