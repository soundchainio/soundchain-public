import { config, DATABASE_SSL_PATH } from './src/config';

const migrationConfig = {
  mongodb: {
    url: config.db.url || 'mongodb://soundchainadmin:i%7CrmUvwben0gw%245D3%5B%7E0ZLw-tX%7EL@localhost:27017/test',
    databaseName: "test",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && 'global-bundle.pem',
      tls: true,
      tlsCAFile: '/Users/soundchain/soundchain/api/global-bundle.pem',
      authMechanism: 'SCRAM-SHA-1',
      retryWrites: false,
      serverSelectionTimeoutMS: 60000,
      tlsAllowInvalidHostnames: true,
      directConnection: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  useFileHash: false,
};

export = migrationConfig;
