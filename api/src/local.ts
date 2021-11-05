import * as Sentry from '@sentry/node';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config';
import { watcher } from './lambda';
import { Context } from './types/Context';

async function bootstrap() {
  Sentry.init({
    dsn: config.sentry.url,
    tracesSampleRate: 1.0,
  });

  await mongoose.connect(config.db.url, config.db.options);

  const app = express();
  app.locals.context = new Context();
  app.use(config.express.middlewares);

  const server = new ApolloServer(config.apollo);
  await server.start();
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: config.express.port }, resolve));
  setInterval(() => watcher({}, undefined, null), 60 * 1000);
  // setInterval(() => playbackCount({}, undefined, null), 60 * 1000);

  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
