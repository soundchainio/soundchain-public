/**
 * Migration: Fresh SoundChain API Key
 * Generated: Dec 30, 2025 @ 9:30 AM
 */

const crypto = require('crypto');

module.exports = {
  async up(db) {
    console.log('=== CREATING FRESH SOUNDCHAIN API KEY ===');

    const apiKeys = db.collection('developerapikeys');

    // Delete any existing SoundChain keys
    const deleted = await apiKeys.deleteMany({ companyName: 'SoundChain' });
    console.log('Deleted existing keys:', deleted.deletedCount);

    // Generate new API key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const rawKey = 'sc_live_' + randomBytes;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 15) + '...' + rawKey.substring(rawKey.length - 4);

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
