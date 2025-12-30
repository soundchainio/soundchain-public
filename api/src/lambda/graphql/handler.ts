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

  // Authenticated endpoints
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
