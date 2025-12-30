import type { Handler } from 'aws-lambda';
import { config, database, up } from 'migrate-mongo';

// Build runtime config from environment variables
const getRuntimeConfig = () => {
  const url = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soundchain';
  return {
    mongodb: {
      url: url,
      databaseName: 'test', // DocumentDB uses 'test' as default database
      options: {
        tls: url.includes('docdb.amazonaws.com'),
        tlsAllowInvalidCertificates: true,
        retryWrites: false,
        directConnection: false,
      },
    },
    migrationsDir: './migrations',
    changelogCollectionName: 'changelog',
    migrationFileExtension: '.js',
    useFileHash: false,
    moduleSystem: 'commonjs',
  };
};

export const handler: Handler = async () => {
  console.log('=== MIGRATE HANDLER v2.0 ===');
  console.log('Starting migrations');
  console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
  console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

  // Debug: List available migration files
  const fs = await import('fs');
  const path = await import('path');
  const migrationsDir = path.join(process.cwd(), 'migrations');
  console.log('Migrations directory:', migrationsDir);
  try {
    const files = fs.readdirSync(migrationsDir);
    console.log('Available migration files:', files.filter(f => f.endsWith('.js')));
  } catch (e: unknown) {
    console.log('Error listing migrations:', (e as Error).message);
  }

  const migrationConfig = getRuntimeConfig();
  console.log('Using MongoDB URL prefix:', migrationConfig.mongodb.url.substring(0, 50) + '...');

  // casting because the migrate-mongo type is wrong
  config.set(migrationConfig as unknown as config.Config);
  const { db, client } = await database.connect();

  // Debug: List databases and collections
  try {
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:', dbs.databases.map((d: {name: string}) => d.name));

    const collections = await db.listCollections().toArray();
    console.log('Collections in soundchain:', collections.map(c => c.name));

    // Try different database names
    const testDb = client.db('test');
    const testColls = await testDb.listCollections().toArray();
    console.log('Collections in test:', testColls.map(c => c.name));

    const testTracks = await testDb.collection('tracks').countDocuments();
    console.log('Tracks in test db:', testTracks);
  } catch (dbErr: unknown) {
    console.log('DB debug error:', (dbErr as Error).message);
  }
  const migrated = await up(db, client);
  if (migrated.length) {
    migrated.forEach(fileName => console.log('Migrated:', fileName));
  } else {
    console.log('No pending migrations');
  }

  // DIRECT INSERT: Ensure SoundChain API key exists (bypasses migration tracking)
  // This runs every time but only creates if not exists
  try {
    const testDb = client.db('test');
    const apiKeys = testDb.collection('developerapikeys');

    // Pre-generated SoundChain official API key
    const apiKeyHash = '58f7c4a5878c96c41ffaa4f90f3a8e6ca6044a3a00c4453a5be798985aeca293';

    // Check if key exists
    const existing = await apiKeys.findOne({ apiKeyHash });

    if (!existing) {
      console.log('=== INSERTING SOUNDCHAIN API KEY ===');

      const apiKey = {
        apiKeyHash: apiKeyHash,
        keyPrefix: 'sc_live_7ee55da...ef2b',
        profileId: 'SOUNDCHAIN_OFFICIAL',
        companyName: 'SoundChain',
        contactEmail: 'announcements@soundchain.io',
        website: 'https://soundchain.io',
        description: 'Official SoundChain platform announcements',
        logoUrl: 'https://soundchain.io/soundchain-meta-logo.png',
        status: 'ACTIVE',
        tier: 'ENTERPRISE',
        verified: true,
        dailyRequestCount: 0,
        totalRequests: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await apiKeys.insertOne(apiKey);
      console.log('SoundChain API key created! ID:', result.insertedId);
      console.log('Use key: sc_live_7ee55da396790c3142cf150f30fd4f9003c175a62610ffbac8afae71241bef2b');
    } else {
      console.log('SoundChain API key already exists');
    }
  } catch (keyErr: unknown) {
    console.log('API key check/insert error:', (keyErr as Error).message);
  }

  await client.close();
  console.log('Migrations finish');
};
