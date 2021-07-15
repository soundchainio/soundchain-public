import '01/../reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { buildSchemaSync } from 'type-graphql';
import resolvers from './resolvers';

const { PORT = 4000 } = process.env;

async function bootstrap() {
  const schema = buildSchemaSync({ resolvers });

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  const { url } = await server.listen(PORT);
  console.log(`Server is running, GraphQL Playground available at ${url}`);
}

bootstrap();
