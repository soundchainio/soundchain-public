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
    // IMPORTANT: Collection name must match Mongoose model: 'developer_api_keys' (with underscore!)
    const apiKeys = testDb.collection('developer_api_keys');

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

  // DIAGNOSE: homie_yay_yay account issue
  // User can't access homie_yay_yay profile - logging in with email shows Rick Deckard instead
  try {
    const testDb = client.db('test');
    console.log('\n🔍 === DIAGNOSING ACCOUNT: homie_yay_yay ===');

    // 1. Find all users with email containing 'homieyay'
    const usersWithEmail = await testDb.collection('users').find({
      email: { $regex: /homieyay/i }
    }).toArray();

    console.log(`📧 Found ${usersWithEmail.length} user(s) with homieyay email:`);
    for (const user of usersWithEmail) {
      console.log('  USER:', user._id.toString());
      console.log('    Email:', user.email);
      console.log('    Handle:', user.handle);
      console.log('    Profile ID:', user.profileId?.toString());
      console.log('    Auth Method:', user.authMethod);
      console.log('    Created:', user.createdAt);
    }

    // 2. Find profile with handle homie_yay_yay or similar
    const homieProfiles = await testDb.collection('profiles').find({
      $or: [
        { userHandle: 'homie_yay_yay' },
        { userHandle: { $regex: /homie/i } },
        { displayName: { $regex: /homie/i } }
      ]
    }).toArray();

    console.log(`👤 Found ${homieProfiles.length} profile(s) matching 'homie':`);
    for (const profile of homieProfiles) {
      console.log('  PROFILE:', profile._id.toString());
      console.log('    Display Name:', profile.displayName);
      console.log('    User Handle:', profile.userHandle);
      console.log('    Bio:', profile.bio?.substring(0, 50) || 'none');
      console.log('    Followers:', profile.followerCount);

      // Find user linked to this profile
      const linkedUser = await testDb.collection('users').findOne({ profileId: profile._id });
      if (linkedUser) {
        console.log('    LINKED USER EMAIL:', linkedUser.email);
        console.log('    LINKED USER AUTH:', linkedUser.authMethod);
      } else {
        console.log('    ⚠️ NO USER LINKED TO THIS PROFILE!');
      }
    }

    // 3. Find Rick Deckard profile
    const rickProfiles = await testDb.collection('profiles').find({
      $or: [
        { displayName: { $regex: /rick/i } },
        { displayName: { $regex: /deckard/i } }
      ]
    }).toArray();

    console.log(`👤 Found ${rickProfiles.length} profile(s) matching 'Rick/Deckard':`);
    for (const profile of rickProfiles) {
      console.log('  PROFILE:', profile._id.toString());
      console.log('    Display Name:', profile.displayName);
      console.log('    User Handle:', profile.userHandle);

      const linkedUser = await testDb.collection('users').findOne({ profileId: profile._id });
      if (linkedUser) {
        console.log('    LINKED USER EMAIL:', linkedUser.email);
        console.log('    LINKED USER AUTH:', linkedUser.authMethod);
      }
    }

    console.log('=== END DIAGNOSIS ===\n');
  } catch (diagErr: unknown) {
    console.log('Diagnosis error:', (diagErr as Error).message);
  }

  // FIX: Link homieyay.eth@gmail.com to homie_yay_yay profile (not Rick Deckard)
  try {
    const testDb = client.db('test');
    const users = testDb.collection('users');
    const { ObjectId } = await import('mongodb');

    const homieProfileId = new ObjectId('61f09cbb6dce7c00096faa5e');
    const homieyayUserId = new ObjectId('66b5bd84553eec0008c5dbec');

    // Check current state
    const user = await users.findOne({ _id: homieyayUserId });
    if (user && user.profileId?.toString() !== homieProfileId.toString()) {
      console.log('🔧 FIXING: Updating homieyay.eth@gmail.com to link to homie_yay_yay profile');
      console.log('  Current profileId:', user.profileId?.toString());
      console.log('  Target profileId:', homieProfileId.toString());

      const result = await users.updateOne(
        { _id: homieyayUserId },
        { $set: { profileId: homieProfileId, updatedAt: new Date() } }
      );

      console.log('  Update result: matched=' + result.matchedCount + ', modified=' + result.modifiedCount);
      console.log('✅ Account fix complete!');
    } else if (user) {
      console.log('✓ homieyay.eth@gmail.com already linked to homie_yay_yay profile');
    }
  } catch (fixErr: unknown) {
    console.log('Account fix error:', (fixErr as Error).message);
  }

  // CLEANUP: Delete announcements with wrong images (one-time cleanup)
  try {
    const testDb = client.db('test');
    const announcements = testDb.collection('announcements');

    // Delete the old playlist announcement with Spotify-looking image
    const deleteResult = await announcements.deleteMany({
      imageUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=1200&q=80'
    });
    if (deleteResult.deletedCount > 0) {
      console.log('Deleted', deleteResult.deletedCount, 'announcement(s) with Spotify image');
    }

    // Also delete the old 2024-2025 announcement (wrong year)
    const deleteOldYear = await announcements.deleteMany({
      title: { $regex: '2024.*2025', $options: 'i' }
    });
    if (deleteOldYear.deletedCount > 0) {
      console.log('Deleted', deleteOldYear.deletedCount, 'announcement(s) with wrong year');
    }
  } catch (cleanupErr: unknown) {
    console.log('Announcement cleanup error:', (cleanupErr as Error).message);
  }

  await client.close();
  console.log('Migrations finish');
};
