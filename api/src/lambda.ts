import { mongoose } from '@typegoose/typegoose';
import { ApolloServer } from 'apollo-server-lambda';
import type { Handler } from 'aws-lambda';
import express from 'express';
import { config } from './config';
import { EmailService } from './services/EmailService';

export const handler: Handler = async (...args) => {
  await mongoose.connect(config.db.url, config.db.options as mongoose.ConnectionOptions);

  EmailService.initialize();

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
