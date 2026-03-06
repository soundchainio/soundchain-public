/**
 * Announcement Service
 *
 * Handles creating, retrieving, and managing announcements
 * from the SoundChain Developer Platform.
 */

import { Service } from './Service';
import {
  Announcement,
  AnnouncementModel,
  AnnouncementStatus,
  AnnouncementType,
} from '../models/Announcement';
import { DeveloperApiKeyModel } from '../models/DeveloperApiKey';

export interface CreateAnnouncementInput {
  apiKeyId: string;
  title: string;
  content: string;
  link?: string;
  imageUrl?: string;
  type?: AnnouncementType;
  tags?: string[];
  scheduledFor?: Date;
}

export class AnnouncementService extends Service {
  /**
   * Create a new announcement
   */
  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    // Get company info from API key
    const apiKey = await DeveloperApiKeyModel.findById(input.apiKeyId);

    if (!apiKey) {
      throw new Error('Invalid API key');
    }

    const announcement = await AnnouncementModel.create({
      apiKeyId: input.apiKeyId,
      companyName: apiKey.companyName,
      companyLogo: apiKey.logoUrl,
      title: input.title,
      content: input.content,
      link: input.link,
      imageUrl: input.imageUrl,
      type: input.type || AnnouncementType.OTHER,
      tags: input.tags || [],
      status: AnnouncementStatus.APPROVED, // Auto-approve for now
      scheduledFor: input.scheduledFor,
      publishedAt: input.scheduledFor ? undefined : new Date(),
      viewCount: 0,
      clickCount: 0,
      featured: false,
    } as any);

    return announcement;
  }

  /**
   * Get announcements feed (public)
   */
  async getFeed(options: {
    limit?: number;
    offset?: number;
    type?: AnnouncementType;
    companyName?: string;
  }): Promise<{ announcements: Announcement[]; total: number }> {
    const { limit = 20, offset = 0, type, companyName } = options;

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

    if (companyName) {
      query.companyName = { $regex: companyName, $options: 'i' };
    }

    const [announcements, total] = await Promise.all([
      AnnouncementModel.find(query)
        .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit),
      AnnouncementModel.countDocuments(query),
    ]);

    return { announcements, total };
  }

  /**
   * Get single announcement by ID
   */
  async getById(id: string): Promise<Announcement | null> {
    return AnnouncementModel.findById(id);
  }

  /**
   * Get announcements by API key (for dashboard)
   */
  async getByApiKey(apiKeyId: string, limit = 50): Promise<Announcement[]> {
    return AnnouncementModel.find({ apiKeyId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await AnnouncementModel.updateOne(
      { _id: id },
      { $inc: { viewCount: 1 } }
    );
  }

  /**
   * Increment click count
   */
  async incrementClickCount(id: string): Promise<void> {
    await AnnouncementModel.updateOne(
      { _id: id },
      { $inc: { clickCount: 1 } }
    );
  }

  /**
   * Update announcement status (moderation)
   */
  async updateStatus(
    id: string,
    status: AnnouncementStatus,
    moderatorId?: string,
    notes?: string
  ): Promise<Announcement | null> {
    return AnnouncementModel.findByIdAndUpdate(
      id,
      {
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationNotes: notes,
      },
      { new: true }
    );
  }

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string, apiKeyId: string): Promise<boolean> {
    const result = await AnnouncementModel.deleteOne({ _id: id, apiKeyId });
    return result.deletedCount > 0;
  }

  /**
   * Feature/unfeature an announcement (admin only)
   */
  async setFeatured(id: string, featured: boolean): Promise<Announcement | null> {
    return AnnouncementModel.findByIdAndUpdate(
      id,
      { featured },
      { new: true }
    );
  }

  /**
   * Get stats for an API key
   */
  async getStats(apiKeyId: string): Promise<{
    totalAnnouncements: number;
    totalViews: number;
    totalClicks: number;
  }> {
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

    return stats[0] || { totalAnnouncements: 0, totalViews: 0, totalClicks: 0 };
  }
}

export default AnnouncementService;
