/**
 * Seed the WIN-WIN Streaming Rewards Announcement
 *
 * Run: npx ts-node src/db/seedWinWinAnnouncement.ts
 */

import mongoose from 'mongoose';
import { AnnouncementModel, AnnouncementStatus, AnnouncementType, MediaType } from '../models/Announcement';
import { DeveloperApiKeyModel, DeveloperTier } from '../models/DeveloperApiKey';

const { DATABASE_URL = 'mongodb://localhost:27017/soundchain' } = process.env;

async function seedWinWinAnnouncement() {
  console.log('Connecting to database...');
  await mongoose.connect(DATABASE_URL);

  // First, ensure we have a SoundChain Official API key
  let soundchainApiKey = await DeveloperApiKeyModel.findOne({ companyName: 'SoundChain Official' });

  if (!soundchainApiKey) {
    console.log('Creating SoundChain Official API key...');
    soundchainApiKey = await DeveloperApiKeyModel.create({
      apiKey: 'sc_official_' + Date.now(),
      companyName: 'SoundChain Official',
      companyLogo: '/images/soundchain-logo.png',
      contactEmail: 'team@soundchain.io',
      tier: DeveloperTier.ENTERPRISE,
      isActive: true,
      usageCount: 0,
      createdAt: new Date(),
    });
  }

  console.log('Creating WIN-WIN Streaming Rewards Announcement...');

  const announcement = await AnnouncementModel.create({
    apiKeyId: soundchainApiKey._id.toString(),
    companyName: 'SoundChain Official',
    companyLogo: '/images/soundchain-logo.png',

    title: 'WIN-WIN STREAMING REWARDS ARE HERE!',

    content: `# The Revolution is Here!

We're thrilled to announce the most groundbreaking feature in music streaming history: **WIN-WIN Streaming Rewards**!

## How It Works

Every time a track is streamed on SoundChain, EVERYONE wins:

### For Creators & NFT Owners
- **Earn OGUN tokens** every time your music is streamed
- **NFT tracks earn 10x more** (0.5 OGUN vs 0.05 OGUN per stream)
- **Verified artists get 1.5x bonus** multiplier
- **All collaborator wallets** in your NFT metadata get their split automatically

### For Listeners & Fans
- **Earn OGUN tokens** just by streaming music you love
- **No catch** - just listen and earn
- **Gamified notifications** - watch gold coins drop like Sonic rings every time you earn!

## The WIN-WIN Promise

Unlike traditional streaming platforms where artists get fractions of a penny and listeners get nothing, SoundChain's WIN-WIN model ensures:

- **Creators WIN** - Get paid fairly for every stream
- **Listeners WIN** - Get rewarded for supporting artists
- **Collaborators WIN** - All wallets in NFT metadata automatically receive their share
- **The Community WINS** - A sustainable ecosystem where everyone benefits

## Powered by OGUN Token

All rewards are paid in **OGUN** on Polygon, with instant payouts directly to your wallet. You can:
- Claim rewards anytime
- Stake directly for even more earnings
- Trade on DEXs

## Start Earning NOW!

1. **Creators**: Upload your music and mint as NFTs for 10x rewards
2. **Listeners**: Stream any track for 30+ seconds to earn
3. **Watch the coins fly** - Our new gamified toast notifications show your earnings in real-time!

---

*SoundChain: Where Music Meets Web3. Everyone Wins.*

**5 Million OGUN** funded in the treasury and ready to reward our community!`,

    link: 'https://soundchain.io/dex/stake',

    // Epic hero image for the announcement
    imageUrl: '/images/win-win-announcement-hero.png',
    mediaType: MediaType.IMAGE,

    type: AnnouncementType.FEATURE_UPDATE,

    tags: [
      'OGUN',
      'Streaming Rewards',
      'WIN-WIN',
      'NFT',
      'Polygon',
      'Web3',
      'Music',
      'Earn',
      'Creators',
      'Listeners',
      'Revolutionary'
    ],

    status: AnnouncementStatus.APPROVED,
    publishedAt: new Date(),
    featured: true, // Pin this to the top!
    viewCount: 0,
    clickCount: 0,
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('WIN-WIN ANNOUNCEMENT CREATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('');
  console.log('ID:', announcement._id);
  console.log('Title:', announcement.title);
  console.log('Status:', announcement.status);
  console.log('Featured:', announcement.featured);
  console.log('Tags:', announcement.tags?.join(', '));
  console.log('');
  console.log('The announcement is now LIVE in the Announcements tab!');
  console.log('='.repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

seedWinWinAnnouncement().catch(err => {
  console.error('Error seeding announcement:', err);
  process.exit(1);
});
