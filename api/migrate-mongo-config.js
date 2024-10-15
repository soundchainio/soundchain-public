const { DATABASE_URL_PATH = 'mongodb://localhost:27017', DATABASE_SSL_PATH } = process.env;

const migrationConfig = {
  mongodb: {
    url: DATABASE_URL_PATH,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && 'global-bundle.pem',
      retryWrites: false,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  useFileHash: false,
};

module.exports = migrationConfig;
