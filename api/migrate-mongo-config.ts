import * as dotenv from 'dotenv'
try {
  dotenv.config()
} catch (e) {
  // Lambda environment - env vars already set
}

// @ts-ignore - legacy types are stubborn
import type { config } from 'migrate-mongo'

const url = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soundchain'

const config: config.Config = {
  mongodb: {
    url: url,
    databaseName: 'soundchain',
    options: {
      tls: url.includes('docdb.amazonaws.com'),
      tlsAllowInvalidCertificates: true,
      retryWrites: false,
    } as any,
  },
  migrationsDir: './migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
}

export default config
