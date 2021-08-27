import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config';

async function bootstrap() {
  await mongoose.connect(config.db.url, config.db.options);
  mongoose.set('debug', true);

  const app = express();
  app.use(config.express.middlewares);

  const server = new ApolloServer(config.apollo);
  await server.start();
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: config.express.port }, resolve));
  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
