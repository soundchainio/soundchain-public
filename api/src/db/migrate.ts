import type { Handler } from 'aws-lambda';
import { database, up } from 'migrate-mongo';

export const handler: Handler = async () => {
  console.log('Starting migrations');
  let success = false;
  const { db, client } = await database.connect();
  try {
    const migrated = await up(db);
    if (migrated.length) migrated.forEach(fileName => console.log('Migrated:', fileName));
    else console.log('No pending migrations');
    success = true;
    console.log('Migrations finish');
  } catch (err) {
    console.log(`Migration Failed: ${err.message}`);
  }
  await client.close();
  return success;
};
