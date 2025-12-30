/**
 * Developer Platform REST API Routes
 *
 * These endpoints allow external developers/startups to post
 * announcements to SoundChain via simple curl requests.
 *
 * Usage:
 * curl -X POST https://api.soundchain.io/v1/announcements \
 *   -H "Authorization: Bearer sc_live_xxxxx" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title": "...", "content": "..."}'
 */

import { Router, Request, Response } from 'express';
import { DeveloperApiKey, DeveloperApiKeyModel } from '../models/DeveloperApiKey';
import { AnnouncementModel, AnnouncementStatus, AnnouncementType } from '../models/Announcement';

const router = Router();

/**
 * Middleware to validate API key
 */
async function validateApiKey(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or invalid Authorization header',
      hint: 'Use: Authorization: Bearer sc_live_xxxxx',
    });
  }

  const rawKey = authHeader.replace('Bearer ', '');
  const hash = DeveloperApiKey.hashApiKey(rawKey);

  const apiKey = await DeveloperApiKeyModel.findOne({
    apiKeyHash: hash,
    status: 'ACTIVE',
  });

  if (!apiKey) {
    return res.status(401).json({
      error: 'Invalid API key',
      hint: 'Get your API key at soundchain.io/developers',
    });
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json({
      error: 'API key expired',
      hint: 'Generate a new key at soundchain.io/developers',
    });
  }

  // Check rate limit
  const limit = DeveloperApiKey.getRateLimit(apiKey.tier);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset daily count if new day
  if (!apiKey.lastRequestDate || apiKey.lastRequestDate < today) {
    apiKey.dailyRequestCount = 0;
    apiKey.lastRequestDate = new Date();
  }

  if (apiKey.dailyRequestCount >= limit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit,
      resetAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      hint: `Upgrade your tier for higher limits. Current: ${apiKey.tier}`,
    });
  }

  // Increment counters
  apiKey.dailyRequestCount += 1;
  apiKey.totalRequests += 1;
  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  // Attach to request for downstream use
  (req as any).apiKey = apiKey;
  (req as any).rateLimit = {
    limit,
    remaining: limit - apiKey.dailyRequestCount,
    reset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };

  next();
}

/**
 * POST /v1/announcements
 * Create a new announcement
 *
 * Body:
 * {
 *   "title": "Our New Feature",
 *   "content": "We just launched...",
 *   "link": "https://yourapp.com",
 *   "imageUrl": "https://...",
 *   "type": "PRODUCT_LAUNCH",
 *   "tags": ["web3", "music"]
 * }
 */
router.post('/announcements', validateApiKey, async (req: Request, res: Response) => {
  try {
    const apiKey = (req as any).apiKey;
    const rateLimit = (req as any).rateLimit;

    const { title, content, link, imageUrl, type, tags } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.length > 200) {
      return res.status(400).json({
        error: 'Invalid title',
        hint: 'Title is required and must be max 200 characters',
      });
    }

    if (!content || typeof content !== 'string' || content.length > 2000) {
      return res.status(400).json({
        error: 'Invalid content',
        hint: 'Content is required and must be max 2000 characters',
      });
    }

    // Validate type if provided
    const validTypes = Object.values(AnnouncementType);
    const announcementType = type && validTypes.includes(type) ? type : AnnouncementType.OTHER;

    // Create announcement
    const announcement = await AnnouncementModel.create({
      apiKeyId: apiKey._id.toString(),
      companyName: apiKey.companyName,
      companyLogo: apiKey.logoUrl,
      title: title.trim(),
      content: content.trim(),
      link: link || undefined,
      imageUrl: imageUrl || undefined,
      type: announcementType,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      status: AnnouncementStatus.APPROVED,
      publishedAt: new Date(),
      viewCount: 0,
      clickCount: 0,
      featured: false,
    });

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.limit,
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': rateLimit.reset,
    });

    return res.status(201).json({
      success: true,
      announcement: {
        id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        link: announcement.link,
        type: announcement.type,
        companyName: announcement.companyName,
        publishedAt: announcement.publishedAt,
        url: `https://soundchain.io/announcements/${announcement._id}`,
      },
      message: '🚀 Announcement posted to SoundChain!',
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return res.status(500).json({
      error: 'Failed to create announcement',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /v1/announcements
 * Get your announcements
 */
router.get('/announcements', validateApiKey, async (req: Request, res: Response) => {
  try {
    const apiKey = (req as any).apiKey;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const announcements = await AnnouncementModel.find({ apiKeyId: apiKey._id.toString() })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await AnnouncementModel.countDocuments({ apiKeyId: apiKey._id.toString() });

    return res.json({
      announcements: announcements.map(a => ({
        id: a._id,
        title: a.title,
        content: a.content,
        link: a.link,
        type: a.type,
        status: a.status,
        viewCount: a.viewCount,
        clickCount: a.clickCount,
        publishedAt: a.publishedAt,
        createdAt: a.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + announcements.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * DELETE /v1/announcements/:id
 * Delete an announcement
 */
router.delete('/announcements/:id', validateApiKey, async (req: Request, res: Response) => {
  try {
    const apiKey = (req as any).apiKey;
    const { id } = req.params;

    const result = await AnnouncementModel.deleteOne({
      _id: id,
      apiKeyId: apiKey._id.toString(),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

/**
 * GET /v1/stats
 * Get your API usage stats
 */
router.get('/stats', validateApiKey, async (req: Request, res: Response) => {
  try {
    const apiKey = (req as any).apiKey;

    const stats = await AnnouncementModel.aggregate([
      { $match: { apiKeyId: apiKey._id.toString() } },
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

    return res.json({
      stats: {
        totalAnnouncements: result.totalAnnouncements,
        totalViews: result.totalViews,
        totalClicks: result.totalClicks,
        apiKeyTier: apiKey.tier,
        dailyRequestsUsed: apiKey.dailyRequestCount,
        dailyRequestsLimit: DeveloperApiKey.getRateLimit(apiKey.tier),
        totalApiCalls: apiKey.totalRequests,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /v1/feed (PUBLIC - no auth required)
 * Get the public announcements feed
 */
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;

    const query: any = {
      status: AnnouncementStatus.APPROVED,
      $or: [
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    };

    if (type && Object.values(AnnouncementType).includes(type as AnnouncementType)) {
      query.type = type;
    }

    const announcements = await AnnouncementModel.find(query)
      .sort({ featured: -1, publishedAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await AnnouncementModel.countDocuments(query);

    return res.json({
      announcements: announcements.map(a => ({
        id: a._id,
        title: a.title,
        content: a.content,
        link: a.link,
        imageUrl: a.imageUrl,
        type: a.type,
        tags: a.tags,
        companyName: a.companyName,
        companyLogo: a.companyLogo,
        featured: a.featured,
        viewCount: a.viewCount,
        publishedAt: a.publishedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + announcements.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

export default router;
