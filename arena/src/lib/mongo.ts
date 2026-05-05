/**
 * MongoDB client for arena/. Uses connection pooling for serverless.
 * Mirrors web/src/lib/mongodb.ts pattern — same MONGODB_URI cluster,
 * separate `arena` collections (no overlap with music-side tracks/posts/etc).
 *
 * Env check is deferred from module-load to first `arenaDb()` call so a missing
 * MONGODB_URI degrades to a single failing route instead of taking down every
 * route that imports this module (see May 4, 2026 chat 500 incident — module
 * throw fired during import and 500'd `/api/chat/recent`, `/api/game/[id]/chat`,
 * `/api/game/[id]/chat-image` all at once even though only Mongo was missing).
 */
import { MongoClient } from 'mongodb'

const options = {
  maxPoolSize: 3,
  minPoolSize: 0,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

const globalWithMongo = global as typeof globalThis & {
  _arenaMongoClientPromise?: Promise<MongoClient>
}

function getClient(): Promise<MongoClient> {
  if (!globalWithMongo._arenaMongoClientPromise) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('Set MONGODB_URI on the arena Vercel project (same value as web/).')
    }
    const client = new MongoClient(uri, options)
    globalWithMongo._arenaMongoClientPromise = client.connect()
  }
  return globalWithMongo._arenaMongoClientPromise
}

export async function arenaDb() {
  const client = await getClient()
  return client.db('soundchain')
}
