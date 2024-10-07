import 'reflect-metadata';

import * as Sentry from '@sentry/serverless';
import { mongoose } from '@typegoose/typegoose';
import { ApolloServer } from 'apollo-server-lambda';
import type { Handler } from 'aws-lambda';
import express from 'express';
import { config, NODE_ENV } from '../../config';

Sentry.AWSLambda.init({
  dsn: config.sentry.url,
  tracesSampleRate: 1.0,
  environment: NODE_ENV,
});

const graphqlHandler: Handler = async (...args) => {
  console.log('Connecting to MongoDB');
  console.log(config.db.url);
  console.log(config.db.options);
  await mongoose.connect(config.db.url, config.db.options);

  const server = new ApolloServer(config.apollo);
  const apolloHandler = server.createHandler({
    expressAppFromMiddleware(middleware) {
      const app = express();
      app.use(config.express.middlewares);
      app.use(middleware);
      return app;
    },
  });

  return apolloHandler(...args);
};

export const handler = Sentry.AWSLambda.wrapHandler(graphqlHandler);
