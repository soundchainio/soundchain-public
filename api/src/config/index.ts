const config = {
  db: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/soundchain',
    options: {},
  },
  express: {
    port: parseInt(process.env.PORT || "3000", 10),
    middlewares: [],
  },
  apollo: {
    introspection: true,
    playground: true,
  },
};

export default config;
