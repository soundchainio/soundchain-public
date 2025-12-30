/**
 * Migration: Regenerate SoundChain Official API Key
 *
 * Deletes existing key and creates a new one (since we lost the original)
 */

const crypto = require('crypto');

module.exports = {
  async up(db) {
    console.log('=== REGENERATING SOUNDCHAIN OFFICIAL API KEY ===');

    const apiKeys = db.collection('developerapikeys');

    // Delete existing SoundChain key
    const deleted = await apiKeys.deleteOne({ companyName: 'SoundChain' });
    console.log('Deleted existing key:', deleted.deletedCount);

    // Generate new API key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const prefix = 'sc_live_';
    const rawKey = prefix + randomBytes;
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

    console.log('');
    console.log('========================================');
    console.log('  SOUNDCHAIN API KEY (SAVE THIS!)');
    console.log('========================================');
    console.log('');
    console.log(rawKey);
    console.log('');
    console.log('========================================');
    console.log('');

    return { rawKey };
  },

  async down(db) {
    // No down migration
  }
};
