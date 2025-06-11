const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = 'mongodb://soundchainadmin:i%7CrmUvwben0gw%245D3%5B%7E0ZLw-tX%7EL@localhost:27017/test';
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true,
    tlsCAFile: '/Users/soundchain/soundchain/api/global-bundle.pem',
    authMechanism: 'SCRAM-SHA-1',
    tlsAllowInvalidHostnames: true,
    serverSelectionTimeoutMS: 60000,
    family: 4,
  };

  const client = new MongoClient(uri, options);

  try {
    await client.connect();
    console.log('Connected successfully to DocumentDB');
    const db = client.db('test');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await client.close();
  }
}

testConnection();
