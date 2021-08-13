import type { Handler } from 'aws-lambda';
import { database, up } from 'migrate-mongo';

export const handler: Handler = async () => {
  const { db, client } = await database.connect();
  const migrated = await up(db);
  migrated.forEach(fileName => console.log('Migrated:', fileName));
  await client.close();
  return true;
};
