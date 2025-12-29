import type { Handler } from 'aws-lambda';
import { config, database, up } from 'migrate-mongo';

// Build runtime config from environment variables
const getRuntimeConfig = () => {
  const url = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soundchain';
  return {
    mongodb: {
      url: url,
      databaseName: 'soundchain',
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
  await client.close();
  console.log('Migrations finish');
};
