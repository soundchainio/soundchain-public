// import * as Sentry from '@sentry/serverless';
import { ApolloServer } from 'apollo-server-lambda';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import express from 'express';
import { config } from '../../config';
import { mongoose } from '@typegoose/typegoose';

// Sentry.AWSLambda.init({
//   dsn: config.sentry.url,
//   tracesSampleRate: 1.0,
//   environment: NODE_ENV,
// });

const graphqlHandler: APIGatewayProxyHandler = async (...args) => {
  console.log('Connecting to MongoDB');
  console.log(config.db.url);
  console.log(config.db.options);

  try {
    const url =
      'mongodb://production:8uV53MWUu6DPfdL5@db-soundchain-api-production.cluster-capqvzyh8vvd.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false';
    await mongoose.connect(url, { useUnifiedTopology: true, useNewUrlParser: true });

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
