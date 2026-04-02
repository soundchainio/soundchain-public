/**
 * MongoDB Client for Next.js
 *
 * Uses connection pooling for serverless environments
 * Reuses connections across hot reloads in development
 */

import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to environment variables')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Use global singleton in ALL environments — critical for serverless (Vercel Lambda)
// Without this, every cold start creates a new connection, exhausting M0's 500 limit
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

if (!globalWithMongo._mongoClientPromise) {
  client = new MongoClient(uri, options)
  globalWithMongo._mongoClientPromise = client.connect()
}
clientPromise = globalWithMongo._mongoClientPromise

export default clientPromise
