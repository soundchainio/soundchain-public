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
  };
};

export const handler: Handler = async () => {
  console.log('Starting migrations');
  console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
  console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

  const migrationConfig = getRuntimeConfig();
  console.log('Using MongoDB URL prefix:', migrationConfig.mongodb.url.substring(0, 50) + '...');

  // casting because the migrate-mongo type is wrong
  config.set(migrationConfig as unknown as config.Config);
  const { db, client } = await database.connect();
  const migrated = await up(db, client);
  if (migrated.length) {
    migrated.forEach(fileName => console.log('Migrated:', fileName));
  } else {
    console.log('No pending migrations');
  }
  await client.close();
  console.log('Migrations finish');
};
