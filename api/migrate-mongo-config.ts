import { config } from './src/config';

const migrationConfig = {
  mongodb: {
    url: config.db.url,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.ts',
  useFileHash: false,
};

export = migrationConfig;
