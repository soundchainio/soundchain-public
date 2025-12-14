/**
 * Migration script to backfill mediaThumbnail for existing posts
 * Run with: npx ts-node src/scripts/backfillThumbnails.ts
 */

import mongoose from 'mongoose';
import { PostModel } from '../models/Post';
import { fetchMediaThumbnail } from '../utils/oEmbed';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soundchain';

async function backfillThumbnails() {
  console.log('🚀 Starting thumbnail backfill migration...');
  console.log(`📦 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Find all posts with mediaLink but no mediaThumbnail
  const postsToUpdate = await PostModel.find({
    mediaLink: { $exists: true, $nin: [null, ''] },
    $or: [
      { mediaThumbnail: { $exists: false } },
      { mediaThumbnail: null },
      { mediaThumbnail: '' }
    ],
    deleted: { $ne: true }
  }).select('_id mediaLink').lean();

  console.log(`📝 Found ${postsToUpdate.length} posts to process`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < postsToUpdate.length; i++) {
    const post = postsToUpdate[i];
    const progress = `[${i + 1}/${postsToUpdate.length}]`;

    try {
      const thumbnail = await fetchMediaThumbnail(post.mediaLink!);

      if (thumbnail) {
        await PostModel.updateOne(
          { _id: post._id },
          { $set: { mediaThumbnail: thumbnail } }
        );
        updated++;
        console.log(`${progress} ✅ Updated: ${post._id} -> ${thumbnail.substring(0, 50)}...`);
      } else {
        skipped++;
        console.log(`${progress} ⏭️  Skipped (no thumbnail): ${post._id}`);
      }
    } catch (error) {
      failed++;
      console.error(`${progress} ❌ Failed: ${post._id}`, error instanceof Error ? error.message : error);
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 Migration Complete:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${postsToUpdate.length}`);

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
  process.exit(0);
}

backfillThumbnails().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
