import * as Sentry from '@sentry/node';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config';
import { Context } from './types/Context';

async function bootstrap() {

  Sentry.init({
    dsn: "https://a49bd1c893324f19a16c1f972eb64f17@o1011186.ingest.sentry.io/5977741",
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
  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
