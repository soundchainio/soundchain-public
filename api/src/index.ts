import '01/../reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import mongoose from 'mongoose';
import { buildSchemaSync } from 'type-graphql';
import resolvers from './resolvers';

const { PORT = 4000, DATABASE_URL = 'mongodb://localhost:27017' } = process.env;

async function bootstrap() {
  await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });

  const schema = buildSchemaSync({ resolvers });

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  const { url } = await server.listen(PORT);
  console.log(`Server is running, GraphQL Playground available at ${url}`);
}

bootstrap();
