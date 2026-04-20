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
  maxPoolSize: 3,        // Serverless = small pools (was 10 → exhausting M0 500 limit)
  minPoolSize: 0,        // Don't hold idle connections open (was 1)
  maxIdleTimeMS: 10000,  // Close idle connections after 10s (was 30s)
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Vercel serverless: each function instance gets its own pool.
  // With maxPoolSize=3, even 100 concurrent functions = 300 connections (under M0's 500 limit).
  // Previously at maxPoolSize=10, 50 functions = 500 connections = threshold alerts.
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
