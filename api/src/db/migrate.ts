import type { Handler } from 'aws-lambda';
import { config, database, up } from 'migrate-mongo';
import path from 'path';
import { config as appConfig, DATABASE_SSL_PATH } from '../config';

const migrationConfig = {
  mongodb: {
    url: appConfig.db.url,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && path.join(__dirname, 'src', DATABASE_SSL_PATH),
      retryWrites: false,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  useFileHash: false,
};

export const handler: Handler = async () => {
  console.log('Starting migrations');
  // casting because the migrate-mongo type is wrong
  config.set(migrationConfig as unknown as config.Config);
  const { db, client } = await database.connect();
  const migrated = await up(db);
  if (migrated.length) {
    migrated.forEach(fileName => console.log('Migrated:', fileName));
  } else {
    console.log('No pending migrations');
  }
  await client.close();
  console.log('Migrations finish');
};
