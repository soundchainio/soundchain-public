import 'reflect-metadata';

import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';

import { config } from './config';
import { blockchainWatcher } from './lambda/blockchainWatcher';
import { processAuctions } from './lambda/processAuctions';
import { processPending } from './lambda/processPending';
import { Context } from './types/Context';

async function bootstrap() {
  await mongoose.connect(config.db.url, config.db.options);

  const app = express();
  app.locals.context = new Context();
  app.use(config.express.middlewares);

  const server = new ApolloServer({ ...config.apollo, plugins: [ApolloServerPluginLandingPageGraphQLPlayground()] });
  await server.start();
  server.applyMiddleware({ app });

  app.get('/', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is healthy.' });
  });

  await new Promise<void>(resolve => app.listen({ port: config.express.port }, resolve));
  setInterval(() => blockchainWatcher({}, undefined, null), 10 * 10000);
  setInterval(() => processAuctions({}, undefined, null), 10 * 1000);
  setInterval(() => processPending({}, undefined, null), 10 * 1000);
  // setInterval(() => playbackCount({}, undefined, null), 10 * 1000);
  // setInterval(() => setupAirdrop({}, undefined, null), 10 * 1000);

  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
