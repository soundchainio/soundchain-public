/**
 * Developer Platform GraphQL Resolver
 *
 * Handles API key management and announcements for the
 * SoundChain Developer Portal frontend.
 */

import { Arg, Authorized, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from 'type-graphql';
import { Context } from '../types/Context';
import { CurrentUser } from '../decorators/current-user';
import { User } from '../models/User';
import {
  DeveloperApiKey,
  DeveloperApiKeyModel,
  ApiKeyStatus,
  ApiKeyTier,
} from '../models/DeveloperApiKey';
import {
  Announcement,
  AnnouncementModel,
  AnnouncementStatus,
  AnnouncementType,
} from '../models/Announcement';

// Input Types
@InputType()
export class CreateApiKeyInput {
  @Field()
  companyName: string;

  @Field()
  contactEmail: string;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logoUrl?: string;
}

@InputType()
export class UpdateApiKeyInput {
  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  contactEmail?: string;

  @Field({ nullable: true })
  webhookUrl?: string;
}

// Payload Types
@ObjectType()
export class CreateApiKeyPayload {
  @Field(() => DeveloperApiKey)
  apiKey: DeveloperApiKey;

  @Field()
  rawKey: string; // Only returned once!

  @Field()
  message: string;
}

@ObjectType()
export class RegenerateApiKeyPayload {
  @Field(() => DeveloperApiKey)
  apiKey: DeveloperApiKey;

  @Field()
  rawKey: string;

  @Field()
  message: string;
}

@ObjectType()
export class ApiKeyStatsPayload {
  @Field()
  totalAnnouncements: number;

  @Field()
  totalViews: number;

  @Field()
  totalClicks: number;

  @Field()
  dailyRequestsUsed: number;

  @Field()
  dailyRequestsLimit: number;

  @Field()
  totalApiCalls: number;
}

@ObjectType()
export class AnnouncementsFeedPayload {
  @Field(() => [Announcement])
  announcements: Announcement[];

  @Field()
  total: number;

  @Field()
  hasMore: boolean;
}

@Resolver()
export class DeveloperResolver {
  // ==================== QUERIES ====================

  /**
   * Get all API keys for the current user
   */
  @Query(() => [DeveloperApiKey])
  @Authorized()
  async myApiKeys(
    @CurrentUser() { profileId }: User,
  ): Promise<DeveloperApiKey[]> {
    return DeveloperApiKeyModel.find({ profileId: profileId.toString() })
      .sort({ createdAt: -1 });
  }

  /**
   * Get a specific API key by ID
   */
  @Query(() => DeveloperApiKey, { nullable: true })
  @Authorized()
  async apiKey(
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<DeveloperApiKey | null> {
    return DeveloperApiKeyModel.findOne({
      _id: id,
      profileId: profileId.toString(),
    });
  }

  /**
   * Get API key stats
   */
  @Query(() => ApiKeyStatsPayload)
  @Authorized()
  async apiKeyStats(
    @CurrentUser() { profileId }: User,
    @Arg('apiKeyId') apiKeyId: string,
  ): Promise<ApiKeyStatsPayload> {
    const apiKey = await DeveloperApiKeyModel.findOne({
      _id: apiKeyId,
      profileId: profileId.toString(),
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    const stats = await AnnouncementModel.aggregate([
      { $match: { apiKeyId } },
      {
        $group: {
          _id: null,
          totalAnnouncements: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalClicks: { $sum: '$clickCount' },
        },
      },
    ]);

    const result = stats[0] || { totalAnnouncements: 0, totalViews: 0, totalClicks: 0 };

    return {
      totalAnnouncements: result.totalAnnouncements,
      totalViews: result.totalViews,
      totalClicks: result.totalClicks,
      dailyRequestsUsed: apiKey.dailyRequestCount,
      dailyRequestsLimit: DeveloperApiKey.getRateLimit(apiKey.tier),
      totalApiCalls: apiKey.totalRequests,
    };
  }

  /**
   * Get announcements by API key (for dashboard)
   */
  @Query(() => [Announcement])
  @Authorized()
  async myAnnouncements(
    @CurrentUser() { profileId }: User,
    @Arg('apiKeyId') apiKeyId: string,
    @Arg('limit', { defaultValue: 50 }) limit: number,
  ): Promise<Announcement[]> {
    // Verify ownership
    const apiKey = await DeveloperApiKeyModel.findOne({
      _id: apiKeyId,
      profileId: profileId.toString(),
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    return AnnouncementModel.find({ apiKeyId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Public announcements feed
   */
  @Query(() => AnnouncementsFeedPayload)
  async announcementsFeed(
    @Arg('limit', { defaultValue: 20 }) limit: number,
    @Arg('offset', { defaultValue: 0 }) offset: number,
    @Arg('type', () => AnnouncementType, { nullable: true }) type?: AnnouncementType,
  ): Promise<AnnouncementsFeedPayload> {
    const query: any = {
      status: AnnouncementStatus.APPROVED,
      $or: [
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    };

    if (type) {
      query.type = type;
    }

    const [announcements, total] = await Promise.all([
      AnnouncementModel.find(query)
        .sort({ featured: -1, publishedAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 50)),
      AnnouncementModel.countDocuments(query),
    ]);

    return {
      announcements,
      total,
      hasMore: offset + announcements.length < total,
    };
  }

  // ==================== MUTATIONS ====================

  /**
   * Create a new API key
   */
  @Mutation(() => CreateApiKeyPayload)
  @Authorized()
  async createApiKey(
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateApiKeyInput,
  ): Promise<CreateApiKeyPayload> {
    // Generate API key
    const { key, hash, prefix } = DeveloperApiKey.generateApiKey(false);

    const apiKey = await DeveloperApiKeyModel.create({
      apiKeyHash: hash,
      keyPrefix: prefix,
      profileId: profileId.toString(),
      companyName: input.companyName,
      contactEmail: input.contactEmail,
      website: input.website,
      description: input.description,
      logoUrl: input.logoUrl,
      status: ApiKeyStatus.ACTIVE,
      tier: ApiKeyTier.FREE,
      dailyRequestCount: 0,
      totalRequests: 0,
    } as any);

    return {
      apiKey,
      rawKey: key, // Only time this is shown!
      message: '🚀 API key created! Save it now - you won\'t see it again.',
    };
  }

  /**
   * Update API key details
   */
  @Mutation(() => DeveloperApiKey)
  @Authorized()
  async updateApiKey(
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
    @Arg('input') input: UpdateApiKeyInput,
  ): Promise<DeveloperApiKey> {
    const apiKey = await DeveloperApiKeyModel.findOneAndUpdate(
      { _id: id, profileId: profileId.toString() },
      { $set: input },
      { new: true },
    );

    if (!apiKey) {
      throw new Error('API key not found');
    }

    return apiKey;
  }

  /**
   * Regenerate API key (creates new key)
   */
  @Mutation(() => RegenerateApiKeyPayload)
  @Authorized()
  async regenerateApiKey(
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<RegenerateApiKeyPayload> {
    const existing = await DeveloperApiKeyModel.findOne({
      _id: id,
      profileId: profileId.toString(),
    });

    if (!existing) {
      throw new Error('API key not found');
    }

    const { key, hash, prefix } = DeveloperApiKey.generateApiKey(false);

    const apiKey = await DeveloperApiKeyModel.findByIdAndUpdate(
      id,
      {
        apiKeyHash: hash,
        keyPrefix: prefix,
        dailyRequestCount: 0,
        lastRequestDate: null,
      },
      { new: true },
    );

    if (!apiKey) {
      throw new Error('Failed to regenerate key');
    }

    return {
      apiKey,
      rawKey: key,
      message: '🔄 API key regenerated! Save it now - you won\'t see it again.',
    };
  }

  /**
   * Revoke API key
   */
  @Mutation(() => Boolean)
  @Authorized()
  async revokeApiKey(
    @CurrentUser() { profileId }: User,
    @Arg('id') id: string,
  ): Promise<boolean> {
    const result = await DeveloperApiKeyModel.updateOne(
      { _id: id, profileId: profileId.toString() },
      { status: ApiKeyStatus.REVOKED },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Track announcement view (public)
   */
  @Mutation(() => Boolean)
  async trackAnnouncementView(
    @Arg('id') id: string,
  ): Promise<boolean> {
    const result = await AnnouncementModel.updateOne(
      { _id: id },
      { $inc: { viewCount: 1 } },
    );
    return result.modifiedCount > 0;
  }

  /**
   * Track announcement click (public)
   */
  @Mutation(() => Boolean)
  async trackAnnouncementClick(
    @Arg('id') id: string,
  ): Promise<boolean> {
    const result = await AnnouncementModel.updateOne(
      { _id: id },
      { $inc: { clickCount: 1 } },
    );
    return result.modifiedCount > 0;
  }
}

export default DeveloperResolver;
