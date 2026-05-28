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
  maxPoolSize: 1,        // M0 cap is 500 conns; 1 per Lambda survives connection storms (was 3 → hit the cap, Atlas refused new conns = site-wide 500s May 28)
  minPoolSize: 0,        // Don't hold idle connections open
  maxIdleTimeMS: 5000,   // Drain idle connections fast so the M0 pool frees up (was 10s)
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  waitQueueTimeoutMS: 10000, // queue ops on the single conn instead of opening more
  // Vercel serverless: each function instance gets its own pool.
  // maxPoolSize=1 → even 400 concurrent functions = 400 connections (under M0's 500 limit).
  // ROOT FIX is migrating off M0 free tier (cluster "moltbookagents") — its 500-conn
  // cap can't sustain production traffic; this just keeps us under it.
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
