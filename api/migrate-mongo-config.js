const { DATABASE_URL = 'mongodb://localhost:27017', DATABASE_SSL_PATH } = process.env;

const migrationConfig = {
  mongodb: {
    url: DATABASE_URL,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && require('path').join(__dirname, 'src', DATABASE_SSL_PATH),
      retryWrites: false,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  useFileHash: false,
};

module.exports = migrationConfig;
