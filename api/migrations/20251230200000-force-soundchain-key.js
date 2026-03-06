/**
 * Migration: Force Create SoundChain API Key
 * Generated: Dec 30, 2025 @ 12:00 PM
 *
 * This migration forces the creation of the SoundChain official API key
 * by first deleting any existing key and inserting the pre-generated key.
 *
 * RAW KEY: sc_live_7ee55da396790c3142cf150f30fd4f9003c175a62610ffbac8afae71241bef2b
 */

module.exports = {
  async up(db) {
    console.log('=== FORCE CREATE SOUNDCHAIN API KEY ===');

    const apiKeys = db.collection('developerapikeys');

    // Delete any existing SoundChain keys first
    const deleted = await apiKeys.deleteMany({ companyName: 'SoundChain' });
    console.log('Deleted existing keys:', deleted.deletedCount);

    // Also check the other collection name variant
    const devKeys = db.collection('developer_api_keys');
    try {
      const deleted2 = await devKeys.deleteMany({ companyName: 'SoundChain' });
      console.log('Deleted from developer_api_keys:', deleted2.deletedCount);
    } catch (e) {
      console.log('developer_api_keys collection not found or empty');
    }

    // Pre-generated key (SHA-256 hash verified locally)
    const rawKey = 'sc_live_7ee55da396790c3142cf150f30fd4f9003c175a62610ffbac8afae71241bef2b';
    const hash = '58f7c4a5878c96c41ffaa4f90f3a8e6ca6044a3a00c4453a5be798985aeca293';
    const keyPrefix = 'sc_live_7ee55da...ef2b';

    const apiKey = {
      apiKeyHash: hash,
      keyPrefix: keyPrefix,
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
    console.log('API Key inserted with ID:', result.insertedId);

    // Verify the insert
    const verify = await apiKeys.findOne({ apiKeyHash: hash });
    if (verify) {
      console.log('');
      console.log('############################################');
      console.log('#  SOUNDCHAIN API KEY CREATED!            #');
      console.log('############################################');
      console.log('');
      console.log('KEY:', rawKey);
      console.log('HASH:', hash);
      console.log('STATUS:', verify.status);
      console.log('TIER:', verify.tier);
      console.log('');
      console.log('############################################');
    } else {
      console.error('VERIFICATION FAILED - Key not found after insert!');
    }

    return { success: true, keyPrefix, insertedId: result.insertedId };
  },

  async down(db) {
    await db.collection('developerapikeys').deleteMany({ companyName: 'SoundChain' });
  }
};
