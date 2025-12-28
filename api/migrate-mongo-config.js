try {
  require('dotenv').config();
} catch (e) {
  // dotenv config not found in Lambda, env vars already set
}

const url = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/soundchain';

module.exports = {
  mongodb: {
    url: url,
    databaseName: 'soundchain',
    options: {
      tls: url.includes('docdb.amazonaws.com'),
      tlsAllowInvalidCertificates: true,
      retryWrites: false,
      directConnection: false,
    },
  },
  migrationsDir: './migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
};
