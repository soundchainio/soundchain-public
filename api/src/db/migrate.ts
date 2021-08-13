import type { Handler } from 'aws-lambda';
import { database, up } from 'migrate-mongo';

export const handler: Handler = async () => {
  let success = false;
  const { db, client } = await database.connect();
  try {
    const migrated = await up(db);
    migrated.forEach(fileName => console.log('Migrated:', fileName));
    success = true;
  } catch (err) {
    console.log(`Migration Failed: ${err.message}`);
  }
  await client.close();
  return success;
};
