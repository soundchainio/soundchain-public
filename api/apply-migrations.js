// Import reflect-metadata first
require('reflect-metadata');

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { register: tsNodeRegister } = require('ts-node');

// Register ts-node to handle TypeScript files
tsNodeRegister({ transpileOnly: true });

async function applyMigrations() {
  const uri = 'mongodb://soundchainadmin:i%7CrmUvwben0gw%245D3%5B%7E0ZLw-tX%7EL@localhost:27017/test';
  const options = {
    tls: true,
    tlsCAFile: '/Users/soundchain/soundchain/api/global-bundle.pem',
    authMechanism: 'SCRAM-SHA-1',
    tlsAllowInvalidHostnames: true,
    serverSelectionTimeoutMS: 60000,
    directConnection: true,
    retryWrites: false,
  };

  const client = new MongoClient(uri, options);

  try {
    await client.connect();
    console.log('Connected successfully to DocumentDB');
    const db = client.db('test');
    const changelog = db.collection('changelog');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.js')).sort();

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migration = require(migrationPath);
      const migrationName = file;

      const alreadyApplied = await changelog.findOne({ fileName: migrationName });
      if (alreadyApplied) {
        console.log(`Skipping already applied migration: ${migrationName}`);
        continue;
      }

      console.log(`Applying migration: ${migrationName}`);
      await migration.up(db);
      await changelog.insertOne({ fileName: migrationName, appliedAt: new Date() });
      console.log(`Migration applied: ${migrationName}`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

applyMigrations();
