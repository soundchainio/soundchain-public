import '01/../reflect-metadata';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { buildSchemaSync } from 'type-graphql';
import { TypegooseMiddleware } from './middlewares/typegoose-middleware';
import resolvers from './resolvers';

const { PORT = 4000, DATABASE_URL = 'mongodb://localhost:27017' } = process.env;

async function bootstrap() {
  await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });

  const schema = buildSchemaSync({ resolvers, globalMiddlewares: [TypegooseMiddleware] });

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  await server.start();

  const app = express();
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
}

bootstrap();
