import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config';
import { Context } from './types/Context';
import { webhooks } from './webhooks';

async function bootstrap() {
  await mongoose.connect(config.db.url, config.db.options);

  const app = express();
  app.locals.context = new Context();
  app.use('/hooks', webhooks);
  app.use(config.express.middlewares);

  const server = new ApolloServer(config.apollo);
  await server.start();
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: config.express.port }, resolve));
  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
