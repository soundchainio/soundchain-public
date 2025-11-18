import * as dotenv from 'dotenv'
dotenv.config()

// @ts-ignore - legacy types are stubborn
import type { config } from 'migrate-mongo'

const config: config.Config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/soundchain',
    databaseName: 'soundchain',
  },
  migrationsDir: './migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
}

export default config
