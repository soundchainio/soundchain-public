require('dotenv').config();

module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soundchain',
    databaseName: 'soundchain',
  },
  migrationsDir: './migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
};
