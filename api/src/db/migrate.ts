import type { Handler } from 'aws-lambda';
import { database, up } from 'migrate-mongo';

export const handler: Handler = async () => {
  console.log('Starting migrations');
  const { db, client } = await database.connect();
  const migrated = await up(db);
  if (migrated.length) migrated.forEach(fileName => console.log('Migrated:', fileName));
  else console.log('No pending migrations');
  await client.close();
  console.log('Migrations finish');
};
