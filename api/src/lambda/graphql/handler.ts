import { ApolloServer } from 'apollo-server-lambda';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import express from 'express';
import { config } from '../../config';
import { mongoose } from '@typegoose/typegoose';

const graphqlHandler: APIGatewayProxyHandler = async (...args) => {
  try {
    // Use DATABASE_URL from serverless.yml environment variables
    const url = process.env.DATABASE_URL || config.db.url;
    console.log('Connecting to database...');
    await mongoose.connect(url, config.db.options);

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
  } catch (error) {
    console.log(error);
  }
};

export const handler = graphqlHandler;
