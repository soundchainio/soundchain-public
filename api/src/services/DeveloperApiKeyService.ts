/**
 * Developer API Key Service
 *
 * Handles API key generation, validation, and rate limiting
 * for the SoundChain Developer Platform.
 */

import { Service } from './Service';
import {
  DeveloperApiKey,
  DeveloperApiKeyModel,
  ApiKeyStatus,
  ApiKeyTier,
} from '../models/DeveloperApiKey';

export class DeveloperApiKeyService extends Service {
  /**
   * Create a new API key for a developer
   */
  async createApiKey(data: {
    profileId: string;
    companyName: string;
    contactEmail: string;
    website?: string;
    description?: string;
    logoUrl?: string;
  }): Promise<{ apiKey: DeveloperApiKey; rawKey: string }> {
    // Generate a new API key
    const { key, hash, prefix } = DeveloperApiKey.generateApiKey(false);

    const apiKey = await DeveloperApiKeyModel.create({
      apiKeyHash: hash,
      keyPrefix: prefix,
      profileId: data.profileId,
      companyName: data.companyName,
      contactEmail: data.contactEmail,
      website: data.website,
      description: data.description,
      logoUrl: data.logoUrl,
      status: ApiKeyStatus.ACTIVE,
      tier: ApiKeyTier.FREE,
      dailyRequestCount: 0,
      totalRequests: 0,
    });

    // Return the raw key only once - it won't be retrievable again
    return { apiKey, rawKey: key };
  }

  /**
   * Validate an API key and return the associated record
   */
  async validateApiKey(rawKey: string): Promise<DeveloperApiKey | null> {
    const hash = DeveloperApiKey.hashApiKey(rawKey);
    const apiKey = await DeveloperApiKeyModel.findOne({
      apiKeyHash: hash,
      status: ApiKeyStatus.ACTIVE,
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      await DeveloperApiKeyModel.updateOne(
        { _id: apiKey._id },
        { status: ApiKeyStatus.EXPIRED }
      );
      return null;
    }

    return apiKey;
  }

  /**
   * Check and update rate limit for an API key
   * Returns true if within limits, false if exceeded
   */
  async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number }> {
    const apiKey = await DeveloperApiKeyModel.findById(apiKeyId);

    if (!apiKey) {
      return { allowed: false, remaining: 0 };
    }

    const limit = DeveloperApiKey.getRateLimit(apiKey.tier);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset daily count if it's a new day
    if (!apiKey.lastRequestDate || apiKey.lastRequestDate < today) {
      await DeveloperApiKeyModel.updateOne(
        { _id: apiKey._id },
        {
          dailyRequestCount: 1,
          lastRequestDate: new Date(),
          totalRequests: apiKey.totalRequests + 1,
          lastUsedAt: new Date(),
        }
      );
      return { allowed: true, remaining: limit - 1 };
    }

    // Check if within limit
    if (apiKey.dailyRequestCount >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counters
    await DeveloperApiKeyModel.updateOne(
      { _id: apiKey._id },
      {
        $inc: { dailyRequestCount: 1, totalRequests: 1 },
        lastUsedAt: new Date(),
      }
    );

    return { allowed: true, remaining: limit - apiKey.dailyRequestCount - 1 };
  }

  /**
   * Get all API keys for a profile
   */
  async getApiKeysByProfile(profileId: string): Promise<DeveloperApiKey[]> {
    return DeveloperApiKeyModel.find({ profileId }).sort({ createdAt: -1 });
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(id: string): Promise<DeveloperApiKey | null> {
    return DeveloperApiKeyModel.findById(id);
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string, profileId: string): Promise<boolean> {
    const result = await DeveloperApiKeyModel.updateOne(
      { _id: id, profileId },
      { status: ApiKeyStatus.REVOKED }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Update API key details
   */
  async updateApiKey(
    id: string,
    profileId: string,
    data: {
      companyName?: string;
      website?: string;
      description?: string;
      logoUrl?: string;
      contactEmail?: string;
      allowedOrigins?: string[];
      webhookUrl?: string;
    }
  ): Promise<DeveloperApiKey | null> {
    const result = await DeveloperApiKeyModel.findOneAndUpdate(
      { _id: id, profileId },
      { $set: data },
      { new: true }
    );
    return result;
  }

  /**
   * Regenerate an API key (creates new key, keeps settings)
   */
  async regenerateApiKey(id: string, profileId: string): Promise<{ apiKey: DeveloperApiKey; rawKey: string } | null> {
    const existing = await DeveloperApiKeyModel.findOne({ _id: id, profileId });

    if (!existing) {
      return null;
    }

    // Generate new key
    const { key, hash, prefix } = DeveloperApiKey.generateApiKey(false);

    const updated = await DeveloperApiKeyModel.findByIdAndUpdate(
      id,
      {
        apiKeyHash: hash,
        keyPrefix: prefix,
        dailyRequestCount: 0,
        lastRequestDate: null,
      },
      { new: true }
    );

    if (!updated) {
      return null;
    }

    return { apiKey: updated, rawKey: key };
  }

  /**
   * Upgrade API key tier
   */
  async upgradeTier(id: string, tier: ApiKeyTier): Promise<DeveloperApiKey | null> {
    return DeveloperApiKeyModel.findByIdAndUpdate(
      id,
      { tier },
      { new: true }
    );
  }
}

export default DeveloperApiKeyService;
