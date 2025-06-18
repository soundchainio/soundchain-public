const migrationConfig = {
  mongodb: {
    url: 'mongodb://soundchainadmin:i%7CrmUvwben0gw%245D3%5B%7E0ZLw-tX%7EL@localhost:27017/test',
    databaseName: "test",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
  moduleSystem: 'commonjs',
};

export = migrationConfig;
