/**
 * MongoDB client for arena/. Uses connection pooling for serverless.
 * Mirrors web/src/lib/mongodb.ts pattern — same MONGODB_URI cluster,
 * separate `arena` collections (no overlap with music-side tracks/posts/etc).
 */
import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Set MONGODB_URI on the arena Vercel project (same value as web/).')
}

const uri = process.env.MONGODB_URI
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

if (!globalWithMongo._arenaMongoClientPromise) {
  const client = new MongoClient(uri, options)
  globalWithMongo._arenaMongoClientPromise = client.connect()
}

export const mongoClient = globalWithMongo._arenaMongoClientPromise

export async function arenaDb() {
  const client = await mongoClient
  return client.db('soundchain')
}
