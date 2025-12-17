import 'reflect-metadata';
// Trigger deploy - restore env vars - Dec 17 2025
import { ApolloServer } from 'apollo-server-lambda';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import express from 'express';
import { config } from '../../config';
import { mongoose } from '@typegoose/typegoose';

const graphqlHandler: APIGatewayProxyHandler = async (event, context, callback) => {
  console.log('Handler invoked, event:', JSON.stringify(event));
  try {
    // Use DATABASE_URL from serverless.yml environment variables
    const url = process.env.DATABASE_URL || config.db.url;
    console.log('Connecting to database with URL:', url ? 'SET' : 'NOT SET');
    await mongoose.connect(url, config.db.options);
    console.log('Database connected');

    const server = new ApolloServer(config.apollo);
    const apolloHandler = server.createHandler({
      expressAppFromMiddleware(middleware) {
        const app = express();
        app.use(config.express.middlewares);
        app.use(middleware);
        return app;
      },
    });

    console.log('Calling Apollo handler');
    const result = await apolloHandler(event, context, callback);
    console.log('Apollo handler result:', result);
    return result;
  } catch (error) {
    console.log('GraphQL handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(error) }),
    };
  }
};

export const handler = graphqlHandler;
