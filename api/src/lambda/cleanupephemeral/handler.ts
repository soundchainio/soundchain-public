import 'reflect-metadata';
import { mongoose } from '@typegoose/typegoose';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Handler } from 'aws-lambda';
import { PostModel } from '../../models/Post';
import { config, UPLOADS_BUCKET_NAME, UPLOADS_BUCKET_REGION } from '../../config';

/**
 * Ephemeral Post Cleanup Handler
 *
 * This scheduled Lambda runs periodically to clean up expired ephemeral posts.
 * - Finds posts where isEphemeral=true and mediaExpiresAt < now
 * - Deletes the uploaded media files from S3
 * - Clears the uploadedMediaUrl field from posts
 *
 * The post itself is NOT deleted - only the media is removed.
 * The post text and metadata remain, with a "media expired" indicator shown on frontend.
 */
export const cleanupEphemeral: Handler = async () => {
  console.log('[cleanupEphemeral] Starting ephemeral post cleanup...');

  try {
    // Connect to database
    await mongoose.connect(config.db.url, config.db.options);
    console.log('[cleanupEphemeral] Database connected');

    const now = new Date();

    // Find all expired ephemeral posts that still have media
    const expiredPosts = await PostModel.find({
      isEphemeral: true,
      mediaExpiresAt: { $lt: now },
      uploadedMediaUrl: { $exists: true, $ne: null },
    }).lean();

    console.log(`[cleanupEphemeral] Found ${expiredPosts.length} expired ephemeral posts with media`);

    if (expiredPosts.length === 0) {
      console.log('[cleanupEphemeral] No expired posts to clean up');
      return { statusCode: 200, body: 'No expired posts to clean up' };
    }

    // Initialize S3 client
    const s3Client = new S3Client({ region: UPLOADS_BUCKET_REGION || 'us-east-1' });

    let deletedCount = 0;
    let errorCount = 0;

    for (const post of expiredPosts) {
      try {
        const mediaUrl = post.uploadedMediaUrl;

        // Extract S3 key from the URL
        // URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
        let s3Key: string | null = null;
        if (mediaUrl) {
          try {
            const url = new URL(mediaUrl);
            s3Key = url.pathname.replace(/^\//, ''); // Remove leading slash
          } catch {
            console.warn(`[cleanupEphemeral] Invalid URL for post ${post._id}: ${mediaUrl}`);
          }
        }

        // Delete from S3 if we have a valid key
        if (s3Key && UPLOADS_BUCKET_NAME) {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: UPLOADS_BUCKET_NAME,
              Key: s3Key,
            }));
            console.log(`[cleanupEphemeral] Deleted S3 object: ${s3Key}`);
          } catch (s3Err: any) {
            console.warn(`[cleanupEphemeral] S3 delete failed for ${s3Key}: ${s3Err.message}`);
            // Continue anyway - we'll still clear the database field
          }
        }

        // Clear the media fields from the post
        await PostModel.updateOne(
          { _id: post._id },
          {
            $set: {
              uploadedMediaUrl: null,
              uploadedMediaType: null,
              // Keep mediaExpiresAt and isEphemeral for UI to show "expired" state
            },
          }
        );

        deletedCount++;
        console.log(`[cleanupEphemeral] Cleaned up post ${post._id}`);
      } catch (postErr: any) {
        console.error(`[cleanupEphemeral] Error cleaning post ${post._id}: ${postErr.message}`);
        errorCount++;
      }
    }

    console.log(`[cleanupEphemeral] Cleanup complete: ${deletedCount} cleaned, ${errorCount} errors`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ephemeral cleanup complete',
        cleaned: deletedCount,
        errors: errorCount,
        total: expiredPosts.length,
      }),
    };
  } catch (error: any) {
    console.error('[cleanupEphemeral] Fatal error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
