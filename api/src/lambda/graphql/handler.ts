import 'reflect-metadata';
// Trigger deploy - restore env vars - Dec 17 2025
import { ApolloServer } from 'apollo-server-lambda';
import type { APIGatewayProxyHandler, APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda';
import express from 'express';
import { config } from '../../config';
import { mongoose } from '@typegoose/typegoose';
import { DeveloperApiKey, DeveloperApiKeyModel } from '../../models/DeveloperApiKey';
import { AnnouncementModel, AnnouncementStatus, AnnouncementType } from '../../models/Announcement';

let dbConnected = false;

const connectDb = async () => {
  if (dbConnected) return;
  const url = process.env.DATABASE_URL || config.db.url;
  await mongoose.connect(url, config.db.options);
  dbConnected = true;
};

// CORS headers for REST API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Handle Developer API REST endpoints
const handleRestApi = async (event: APIGatewayProxyEvent): Promise<any> => {
  await connectDb();

  const path = event.path;
  const method = event.httpMethod;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // GET /v1/stats - Public historical streaming stats (OG Rewards preview)
  if (path === '/v1/stats' && method === 'GET') {
    const TrackModel = mongoose.model('Track');

    const [
      totalTracks,
      tracksWithPlays,
      playsAgg,
      nftPlaysAgg,
      uniqueCreatorsAgg,
      topTracksResult,
    ] = await Promise.all([
      TrackModel.countDocuments({ deleted: { $ne: true } }),
      TrackModel.countDocuments({ playbackCount: { $gt: 0 }, deleted: { $ne: true } }),
      TrackModel.aggregate([
        { $match: { deleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$playbackCount' } } }
      ]),
      TrackModel.aggregate([
        {
          $match: {
            playbackCount: { $gt: 0 },
            deleted: { $ne: true },
            $or: [
              { 'nftData.tokenId': { $exists: true, $ne: null } },
              { 'nftData.contract': { $exists: true, $ne: null } }
            ]
          }
        },
        { $group: { _id: null, total: { $sum: '$playbackCount' } } }
      ]),
      TrackModel.aggregate([
        { $match: { playbackCount: { $gt: 0 }, deleted: { $ne: true } } },
        { $group: { _id: '$profileId' } },
        { $count: 'count' }
      ]),
      TrackModel.find({ playbackCount: { $gt: 0 }, deleted: { $ne: true } })
        .sort({ playbackCount: -1 })
        .limit(10)
        .select('_id title playbackCount nftData profileId')
        .lean()
    ]);

    const totalPlays = playsAgg[0]?.total || 0;
    const nftPlays = nftPlaysAgg[0]?.total || 0;
    const nonNftPlays = totalPlays - nftPlays;
    const uniqueCreators = uniqueCreatorsAgg[0]?.count || 0;

    // Calculate estimated OGUN (creator's 70% share)
    const nftOgun = nftPlays * 0.35;
    const nonNftOgun = nonNftPlays * 0.035;
    const estimatedCreatorOgun = nftOgun + nonNftOgun;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: '🎵 SoundChain Historical Streaming Stats',
        stats: {
          totalTracks,
          tracksWithPlays,
          totalPlays,
          nftPlays,
          nonNftPlays,
          uniqueCreators,
        },
        ogRewardsEstimate: {
          nftOgun: Math.round(nftOgun * 100) / 100,
          nonNftOgun: Math.round(nonNftOgun * 100) / 100,
          totalEstimatedOgun: Math.round(estimatedCreatorOgun * 100) / 100,
          note: 'NFT tracks: 0.35 OGUN/play, Non-NFT: 0.035 OGUN/play (creator 70%)',
        },
        topTracks: (topTracksResult as any[]).slice(0, 10).map((t, i) => ({
          rank: i + 1,
          title: t.title || 'Untitled',
          plays: t.playbackCount || 0,
          isNft: !!(t.nftData?.tokenId || t.nftData?.contract),
        })),
      }, null, 2),
    };
  }

  // GET /v1/feed - Public feed (no auth)
  if (path === '/v1/feed' && method === 'GET') {
    const params = event.queryStringParameters || {};
    const limit = Math.min(parseInt(params.limit || '20'), 50);
    const offset = parseInt(params.offset || '0');

    const query: any = {
      status: AnnouncementStatus.APPROVED,
      $or: [
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    };

    const announcements = await AnnouncementModel.find(query)
      .sort({ featured: -1, publishedAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await AnnouncementModel.countDocuments(query);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
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
        pagination: { total, limit, offset, hasMore: offset + announcements.length < total },
      }),
    };
  }

  // Admin endpoints use X-Admin-Secret header instead of Bearer token
  // Let them pass through to handle their own auth
  if (path.startsWith('/v1/admin/')) {
    // Admin endpoints are handled below with X-Admin-Secret auth
    // Skip Bearer token auth for these
  } else {
    // Authenticated endpoints (require Bearer token)
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Authorization header', hint: 'Use: Authorization: Bearer sc_live_xxxxx' }),
      };
    }

    const rawKey = authHeader.replace('Bearer ', '');
    const hash = DeveloperApiKey.hashApiKey(rawKey);
    const apiKey = await DeveloperApiKeyModel.findOne({ apiKeyHash: hash, status: 'ACTIVE' });

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid API key' }),
      };
    }

    // POST /v1/announcements - Create announcement
    if (path === '/v1/announcements' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { title, content, link, imageUrl, type, tags } = body;

      if (!title || title.length > 200) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Title required (max 200 chars)' }) };
      }
      if (!content || content.length > 2000) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Content required (max 2000 chars)' }) };
      }

      const validTypes = Object.values(AnnouncementType);
      const announcementType = type && validTypes.includes(type) ? type : AnnouncementType.OTHER;

      const announcement = await AnnouncementModel.create({
        apiKeyId: apiKey._id.toString(),
        companyName: apiKey.companyName,
        companyLogo: apiKey.logoUrl,
        title: title.trim(),
        content: content.trim(),
        link, imageUrl,
        type: announcementType,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        status: AnnouncementStatus.APPROVED,
        publishedAt: new Date(),
        viewCount: 0, clickCount: 0, featured: false,
      } as any);

      // Update API key usage
      apiKey.totalRequests += 1;
      apiKey.lastUsedAt = new Date();
      await apiKey.save();

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          announcement: {
            id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            companyName: announcement.companyName,
            publishedAt: announcement.publishedAt,
          },
          message: '🚀 Announcement posted to SoundChain!',
        }),
      };
    }
  }

  // POST /v1/admin/grandfather-tracks - Create SCids for existing tracks (MUST RUN FIRST!)
  if (path === '/v1/admin/grandfather-tracks' && method === 'POST') {
    const adminSecret = process.env.ADMIN_SECRET || 'soundchain-og-rewards-2026';
    const providedSecret = event.headers?.['x-admin-secret'] || event.headers?.['X-Admin-Secret'];

    if (providedSecret !== adminSecret) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid admin secret', hint: 'Set X-Admin-Secret header' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const dryRun = body.dryRun !== false;
    const limit = body.limit || 0;

    const TrackModel = mongoose.model('Track');
    const SCidModel = mongoose.model('SCid');
    const ProfileModel = mongoose.model('Profile');

    const result = {
      dryRun,
      totalTracksFound: 0,
      tracksWithoutScid: 0,
      scidsCreated: 0,
      skipped: 0,
      nftTracks: 0,
      nonNftTracks: 0,
      errors: [] as string[],
    };

    try {
      // Find all non-deleted tracks
      let query = TrackModel.find({ deleted: { $ne: true } });
      if (limit > 0) query = query.limit(limit);
      const tracks = await query.lean().exec() as any[];
      result.totalTracksFound = tracks.length;

      for (const track of tracks) {
        try {
          const trackId = track._id.toString();
          const profileId = track.profileId?.toString();

          if (!profileId) {
            result.skipped++;
            continue;
          }

          // Check if SCid already exists
          const existingScid = await SCidModel.findOne({ trackId });
          if (existingScid) {
            result.skipped++;
            continue;
          }

          result.tracksWithoutScid++;

          if (!dryRun) {
            // Get profile for artist name
            const profile = await ProfileModel.findById(profileId).lean() as any;
            const artistName = profile?.displayName || profile?.username || profileId;

            // Count existing SCids for sequence
            const existingCount = await SCidModel.countDocuments({ profileId });

            // Generate SCid code: SC-P-{artistHash}-{year}-{sequence}
            const artistHash = artistName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(4, 'X');
            const year = new Date().getFullYear().toString().slice(-2);
            const sequence = String(existingCount + 1).padStart(3, '0');
            const scidCode = `SC-P-${artistHash}-${year}-${sequence}`;

            // Create SCid record
            await SCidModel.create({
              scid: scidCode,
              trackId,
              profileId,
              chainCode: 'P', // Polygon
              artistHash,
              year,
              sequence: existingCount + 1,
              status: 'PENDING',
              streamCount: 0,
              ogunRewardsEarned: 0,
              ogunRewardsClaimed: 0,
            });

            result.scidsCreated++;
          }

          const isNft = !!(track.nftData?.tokenId || track.nftData?.contract);
          if (isNft) result.nftTracks++;
          else result.nonNftTracks++;

        } catch (err: any) {
          result.errors.push(`${track._id}: ${err.message}`);
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: dryRun
            ? '🔍 DRY RUN - No SCids created. Run with dryRun: false to create them!'
            : `🚀 Created ${result.scidsCreated} SCids! WIN-WIN system now active for these tracks!`,
          result,
          nextStep: dryRun
            ? 'Run POST /v1/admin/grandfather-tracks with { "dryRun": false } to create SCids'
            : 'Now run POST /v1/admin/grandfather-og to credit historical OGUN rewards',
        }, null, 2),
      };

    } catch (err: any) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  // POST /v1/admin/grandfather-og - Run OG Grandfather Rewards (requires admin secret)
  if (path === '/v1/admin/grandfather-og' && method === 'POST') {
    const adminSecret = process.env.ADMIN_SECRET || 'soundchain-og-rewards-2026';
    const providedSecret = event.headers?.['x-admin-secret'] || event.headers?.['X-Admin-Secret'];

    if (providedSecret !== adminSecret) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid admin secret', hint: 'Set X-Admin-Secret header' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const limit = body.limit || 0;
    const minPlays = body.minPlays || 1;

    const TrackModel = mongoose.model('Track');
    const SCidModel = mongoose.model('SCid');

    const OG_REWARD_CONFIG = {
      nftRewardPerPlay: 0.35,
      baseRewardPerPlay: 0.035,
      maxRewardPerTrack: 10000,
    };

    const result = {
      dryRun,
      totalTracksProcessed: 0,
      totalPlaysRewarded: 0,
      totalOgunCredited: 0,
      nftTracksRewarded: 0,
      nonNftTracksRewarded: 0,
      creatorsRewarded: 0,
      topRewarded: [] as any[],
      errors: [] as string[],
    };

    const creatorsSet = new Set<string>();
    const trackRewards: any[] = [];

    try {
      let query = TrackModel.find({
        playbackCount: { $gte: minPlays },
        deleted: { $ne: true }
      }).sort({ playbackCount: -1 });

      if (limit > 0) query = query.limit(limit);

      const tracks = await query.lean().exec() as any[];

      for (const track of tracks) {
        try {
          const trackId = track._id.toString();
          const profileId = track.profileId?.toString();
          const playbackCount = track.playbackCount || 0;
          const isNft = !!(track.nftData?.tokenId || track.nftData?.contract);

          if (!profileId) continue;

          const rewardPerPlay = isNft ? OG_REWARD_CONFIG.nftRewardPerPlay : OG_REWARD_CONFIG.baseRewardPerPlay;
          const ogunToCredit = Math.min(playbackCount * rewardPerPlay, OG_REWARD_CONFIG.maxRewardPerTrack);

          if (!dryRun) {
            // Update or create SCid with rewards
            await SCidModel.updateOne(
              { trackId },
              {
                $inc: {
                  streamCount: playbackCount,
                  ogunRewardsEarned: ogunToCredit,
                },
              },
              { upsert: false } // Only update existing SCids
            );
          }

          result.totalTracksProcessed++;
          result.totalPlaysRewarded += playbackCount;
          result.totalOgunCredited += ogunToCredit;
          if (isNft) result.nftTracksRewarded++;
          else result.nonNftTracksRewarded++;

          creatorsSet.add(profileId);
          trackRewards.push({ trackId, title: track.title, plays: playbackCount, ogun: ogunToCredit });

        } catch (err: any) {
          result.errors.push(`${track._id}: ${err.message}`);
        }
      }

      result.creatorsRewarded = creatorsSet.size;
      result.topRewarded = trackRewards.sort((a, b) => b.ogun - a.ogun).slice(0, 20);
      result.totalOgunCredited = Math.round(result.totalOgunCredited * 100) / 100;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: dryRun ? '🔍 DRY RUN - No changes made' : '🚀 OG REWARDS CREDITED!',
          result,
        }, null, 2),
      };

    } catch (err: any) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Not found' }) };
};

const graphqlHandler: APIGatewayProxyHandler = async (event, context, callback) => {
  console.log('Handler invoked, path:', event.path, 'method:', event.httpMethod);

  try {
    // Route REST API requests
    if (event.path.startsWith('/v1/')) {
      return await handleRestApi(event);
    }

    // GraphQL requests
    await connectDb();

    const server = new ApolloServer(config.apollo);
    const apolloHandler = server.createHandler({
      expressAppFromMiddleware(middleware) {
        const app = express();
        app.use(config.express.middlewares);
        app.use(middleware);
        return app;
      },
    });

    return await apolloHandler(event, context, callback);
  } catch (error) {
    console.log('Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};

export const handler = graphqlHandler;
