/**
 * Developer API Key Model
 *
 * Stores API keys for developers/startups to access SoundChain's
 * open platform and post announcements.
 */

import { getModelForClass, modelOptions, prop, Severity, index } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { Model } from './Model';
import crypto from 'crypto';

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(ApiKeyStatus, {
  name: 'ApiKeyStatus',
  description: 'Status of developer API key',
});

export enum ApiKeyTier {
  FREE = 'FREE',           // 10 posts/day
  STARTER = 'STARTER',     // 50 posts/day
  PRO = 'PRO',             // 500 posts/day
  ENTERPRISE = 'ENTERPRISE', // Unlimited
}

registerEnumType(ApiKeyTier, {
  name: 'ApiKeyTier',
  description: 'API key tier with rate limits',
});

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    timestamps: true,
    collection: 'developer_api_keys',
  },
})
@ObjectType()
@index({ apiKey: 1 }, { unique: true })
@index({ profileId: 1 })
@index({ companyName: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
export class DeveloperApiKey extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  /**
   * The API key (hashed for security, prefix shown to user)
   * Format: sc_live_xxxxxxxxxxxx or sc_test_xxxxxxxxxxxx
   */
  @prop({ required: true, unique: true })
  apiKeyHash: string;

  /**
   * Key prefix for display (e.g., sc_live_abc...xyz)
   */
  @Field(() => String)
  @prop({ required: true })
  keyPrefix: string;

  /**
   * Reference to the Profile who owns this API key
   */
  @Field(() => String)
  @prop({ required: true })
  profileId: string;

  /**
   * Company/Startup name
   */
  @Field(() => String)
  @prop({ required: true })
  companyName: string;

  /**
   * Company website
   */
  @Field(() => String, { nullable: true })
  @prop()
  website?: string;

  /**
   * Description of what they're building
   */
  @Field(() => String, { nullable: true })
  @prop()
  description?: string;

  /**
   * Company logo URL
   */
  @Field(() => String, { nullable: true })
  @prop()
  logoUrl?: string;

  /**
   * Contact email for notifications
   */
  @Field(() => String)
  @prop({ required: true })
  contactEmail: string;

  /**
   * API key status
   */
  @Field(() => ApiKeyStatus)
  @prop({ required: true, enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  /**
   * API key tier (rate limits)
   */
  @Field(() => ApiKeyTier)
  @prop({ required: true, enum: ApiKeyTier, default: ApiKeyTier.FREE })
  tier: ApiKeyTier;

  /**
   * Daily request count (resets at midnight UTC)
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  dailyRequestCount: number;

  /**
   * Last request date (for resetting daily count)
   */
  @prop()
  lastRequestDate?: Date;

  /**
   * Total requests made with this key
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  totalRequests: number;

  /**
   * Last used timestamp
   */
  @Field(() => Date, { nullable: true })
  @prop()
  lastUsedAt?: Date;

  /**
   * Expiration date (optional)
   */
  @Field(() => Date, { nullable: true })
  @prop()
  expiresAt?: Date;

  /**
   * Allowed origins (CORS)
   */
  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String], default: [] })
  allowedOrigins?: string[];

  /**
   * Webhook URL for notifications (optional)
   */
  @Field(() => String, { nullable: true })
  @prop()
  webhookUrl?: string;

  /**
   * Timestamps
   */
  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /**
   * Generate a new API key
   */
  static generateApiKey(isTest: boolean = false): { key: string; hash: string; prefix: string } {
    const prefix = isTest ? 'sc_test_' : 'sc_live_';
    const randomPart = crypto.randomBytes(24).toString('hex');
    const key = `${prefix}${randomPart}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const displayPrefix = `${prefix}${randomPart.slice(0, 4)}...${randomPart.slice(-4)}`;

    return { key, hash, prefix: displayPrefix };
  }

  /**
   * Verify an API key
   */
  static hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get rate limit based on tier
   */
  static getRateLimit(tier: ApiKeyTier): number {
    switch (tier) {
      case ApiKeyTier.FREE: return 10;
      case ApiKeyTier.STARTER: return 50;
      case ApiKeyTier.PRO: return 500;
      case ApiKeyTier.ENTERPRISE: return Infinity;
      default: return 10;
    }
  }
}

export const DeveloperApiKeyModel = getModelForClass(DeveloperApiKey);

export default DeveloperApiKey;
