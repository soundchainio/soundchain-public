/**
 * Seed the OG Rewards Announcement
 *
 * Celebrates the grandfather rewards for OG users who've been streaming since 2022!
 *
 * Run: npx ts-node src/db/seedOGRewardsAnnouncement.ts
 */

import mongoose from 'mongoose';
import { AnnouncementModel, AnnouncementStatus, AnnouncementType, MediaType } from '../models/Announcement';
import { DeveloperApiKeyModel, DeveloperApiKey, ApiKeyTier, ApiKeyStatus } from '../models/DeveloperApiKey';

const { DATABASE_URL = 'mongodb://localhost:27017/soundchain' } = process.env;

async function seedOGRewardsAnnouncement() {
  console.log('Connecting to database...');
  await mongoose.connect(DATABASE_URL);

  // First, ensure we have a SoundChain Official API key
  let soundchainApiKey = await DeveloperApiKeyModel.findOne({ companyName: 'SoundChain Official' });

  if (!soundchainApiKey) {
    console.log('Creating SoundChain Official API key...');
    const { key, hash, prefix } = DeveloperApiKey.generateApiKey(false);
    soundchainApiKey = await DeveloperApiKeyModel.create({
      apiKeyHash: hash,
      keyPrefix: prefix,
      profileId: 'soundchain-official',
      companyName: 'SoundChain Official',
      contactEmail: 'team@soundchain.io',
      tier: ApiKeyTier.ENTERPRISE,
      status: ApiKeyStatus.ACTIVE,
    });
    console.log('API Key created (save this, shown only once):', key);
  }

  console.log('Creating OG Rewards Announcement...');

  const announcement = await AnnouncementModel.create({
    apiKeyId: soundchainApiKey._id.toString(),
    companyName: 'SoundChain Official',
    logoUrl: '/favicon.ico',

    title: 'OG REWARDS ARE HERE! Thank You, Pioneers!',

    content: `# To Our Day-One Supporters

You believed in us when we were just getting started. You streamed music, shared tracks, and helped build this community from the ground up.

**Now it's time to give back.**

## OG Creator Rewards

Every stream your tracks have received since 2022 is being credited with **OGUN tokens**:

| Track Type | Reward Per Historical Play |
|------------|---------------------------|
| NFT Tracks | **0.35 OGUN** (10x base!) |
| Standard Tracks | **0.035 OGUN** |

### How It Works

1. **We analyzed** all playback data from 2022-2026
2. **We calculated** OGUN rewards based on your total streams
3. **We credited** your rewards as a **CLAIMABLE BALANCE**

## Check Your OG Rewards

Visit the **Stake Page** to see your claimable OG rewards! These tokens are:

- **Immediately claimable** to your wallet
- **OR stake directly** for even more earnings
- **No expiration** - claim whenever you want

## The Numbers

We're distributing rewards based on:
- Every track with 1+ plays
- NFT tracks get premium 10x rate
- Verified artists get bonus multipliers
- Max 10,000 OGUN per track (to keep it fair)

## Why We're Doing This

Traditional streaming platforms take everything and give artists pennies. We're different.

**You supported SoundChain before it was cool.** You uploaded your first tracks. You played music when the platform was new. You invited your friends. You believed.

This isn't charity. **This is what you earned.**

## What's Next?

1. Check your OG rewards balance on the Stake page
2. Claim to wallet OR stake directly
3. Keep streaming - WIN-WIN rewards are LIVE for all new plays!
4. Tell other OGs to check their rewards

---

**From all of us at SoundChain:**

Thank you for being here. Thank you for believing. Thank you for making music matter.

This is just the beginning.

*The SoundChain Team*

---

*Questions? DM us or check the FAQ on soundchain.io*`,

    link: 'https://soundchain.io/dex/stake',

    // Hero image for OG rewards
    imageUrl: '/images/og-rewards-hero.png',
    mediaType: MediaType.IMAGE,

    type: AnnouncementType.COMMUNITY,

    tags: [
      'OG',
      'Rewards',
      'OGUN',
      'Grandfather',
      'Thank You',
      'Pioneers',
      'Day One',
      'Claimable',
      'Staking',
      'Community',
      '2022',
      'Historical'
    ],

    status: AnnouncementStatus.APPROVED,
    publishedAt: new Date(),
    featured: true, // Pin this alongside WIN-WIN!
    viewCount: 0,
    clickCount: 0,
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('OG REWARDS ANNOUNCEMENT CREATED!');
  console.log('='.repeat(60));
  console.log('');
  console.log('ID:', announcement._id);
  console.log('Title:', announcement.title);
  console.log('Status:', announcement.status);
  console.log('Featured:', announcement.featured);
  console.log('Tags:', announcement.tags?.join(', '));
  console.log('');
  console.log('The OG Rewards announcement is now LIVE!');
  console.log('='.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

seedOGRewardsAnnouncement().catch(err => {
  console.error('Error seeding announcement:', err);
  process.exit(1);
});
