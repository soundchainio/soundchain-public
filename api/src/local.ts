import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

import { config } from './config';
import { blockchainWatcher } from './lambda/blockchainwatcher/handler';
import { processAuctions } from './lambda/processauctions/handler';
import { processPending } from './lambda/processpending/handler';
import { Context } from './types/Context';
import cors from 'cors';

async function bootstrap() {
  // Connect to MongoDB using environment variable
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/soundchain';
  console.log(`📡 Connecting to MongoDB: ${mongoUrl.includes('localhost:27017') ? 'LOCAL (development)' : 'PRODUCTION DocumentDB'}`);

  // Configure connection options
  const connectOptions: any = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    directConnection: true
  };

  await mongoose.connect(mongoUrl, connectOptions);

  const app = express();
  app.locals.context = new Context();

  // Add logging middleware for all requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.use(config.express.middlewares);
  app.use(cors({ origin: "https://www.soundchain.io" }));

  const server = new ApolloServer({
    ...config.apollo,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()]
  });
  await server.start();
  server.applyMiddleware({ app: app as any });

  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Server is healthy.' });
  });

  await new Promise<void>((resolve, reject) => {
    app.listen(config.express.port, (err?: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Temporarily disable blockchainWatcher due to incorrect MARKETPLACE_ADDRESS
  // setInterval(() => blockchainWatcher({}, undefined, null), 10 * 10000);
  setInterval(() => processAuctions({}, undefined, null), 10 * 1000);
  setInterval(() => processPending({}, undefined, null), 10 * 1000);

  console.log(`🚀 Server ready at http://localhost:${config.express.port}${server.graphqlPath}`);
}

bootstrap();
