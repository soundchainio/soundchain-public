import type { Handler } from 'aws-lambda';
import { config, database, up } from 'migrate-mongo';
import migrationConfig from '../../../migrate-mongo-config.js';

export const handler: Handler = async () => {
  console.log('Starting migrations');

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
