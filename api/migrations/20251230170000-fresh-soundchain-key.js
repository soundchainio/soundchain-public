/**
 * Migration: Fresh SoundChain API Key
 * Generated: Dec 30, 2025 @ 9:30 AM
 *
 * PRE-GENERATED KEY (so we know it in advance):
 * sc_live_7ee55da396790c3142cf150f30fd4f9003c175a62610ffbac8afae71241bef2b
 */

module.exports = {
  async up(db) {
    console.log('=== CREATING FRESH SOUNDCHAIN API KEY ===');

    const apiKeys = db.collection('developerapikeys');

    // Delete any existing SoundChain keys
    const deleted = await apiKeys.deleteMany({ companyName: 'SoundChain' });
    console.log('Deleted existing keys:', deleted.deletedCount);

    // Pre-generated key (generated locally, hash verified)
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

    await apiKeys.insertOne(apiKey);

    // Output the key prominently
    console.log('');
    console.log('############################################');
    console.log('#  SOUNDCHAIN API KEY - SAVE THIS NOW!    #');
    console.log('############################################');
    console.log('');
    console.log('KEY:', rawKey);
    console.log('');
    console.log('############################################');
    console.log('');

    return { success: true, keyPrefix };
  },

  async down(db) {
    await db.collection('developerapikeys').deleteMany({ companyName: 'SoundChain' });
  }
};
