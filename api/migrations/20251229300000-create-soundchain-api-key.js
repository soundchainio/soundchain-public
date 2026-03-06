/**
 * Migration: Create SoundChain Official API Key
 *
 * Creates an ENTERPRISE-tier API key for SoundChain's own announcements.
 * The raw key will be output to logs - SAVE IT!
 */

const crypto = require('crypto');

module.exports = {
  async up(db) {
    console.log('=== CREATING SOUNDCHAIN OFFICIAL API KEY ===');

    const apiKeys = db.collection('developerapikeys');

    // Check if SoundChain key already exists
    const existing = await apiKeys.findOne({ companyName: 'SoundChain' });
    if (existing) {
      console.log('SoundChain API key already exists');
      console.log('Key prefix:', existing.keyPrefix);
      return;
    }

    // Generate API key (same logic as DeveloperApiKey model)
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const prefix = 'sc_live_';
    const rawKey = prefix + randomBytes;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 15) + '...' + rawKey.substring(rawKey.length - 4);

    const apiKey = {
      apiKeyHash: hash,
      keyPrefix: keyPrefix,
      profileId: 'SOUNDCHAIN_OFFICIAL', // Special identifier
      companyName: 'SoundChain',
      contactEmail: 'announcements@soundchain.io',
      website: 'https://soundchain.io',
      description: 'Official SoundChain platform announcements',
      logoUrl: 'https://soundchain.io/soundchain-meta-logo.png',
      status: 'ACTIVE',
      tier: 'ENTERPRISE', // Unlimited requests
      verified: true,
      dailyRequestCount: 0,
      totalRequests: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await apiKeys.insertOne(apiKey);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🔑 SOUNDCHAIN OFFICIAL API KEY CREATED!                       ║');
    console.log('║                                                                 ║');
    console.log('║  ⚠️  SAVE THIS KEY NOW - IT WON\'T BE SHOWN AGAIN!             ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║');
    console.log('║  ' + rawKey);
    console.log('║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Add to your .env:');
    console.log(`SOUNDCHAIN_ANNOUNCEMENT_KEY=${rawKey}`);
    console.log('');

    return { rawKey };
  },

  async down(db) {
    console.log('Removing SoundChain official API key...');
    await db.collection('developerapikeys').deleteOne({ companyName: 'SoundChain' });
    console.log('Done.');
  }
};
