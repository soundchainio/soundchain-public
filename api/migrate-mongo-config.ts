import path from 'path';
import { config, DATABASE_SSL_PATH } from './src/config';

const migrationConfig = {
  mongodb: {
    url: config.db.url,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && path.join(__dirname, 'src', DATABASE_SSL_PATH),
      retryWrites: false,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  useFileHash: false,
};

export = migrationConfig;
