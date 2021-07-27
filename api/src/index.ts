import '01/../reflect-metadata';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { buildSchemaSync } from 'type-graphql';
import { TypegooseMiddleware } from './middlewares/typegoose-middleware';
import resolvers from './resolvers';
import JwtService, { JwtUser } from './services/JwtService';
import { UserService } from './services/UserService';
import Context from './types/Context';

const { PORT = 4000, DATABASE_URL = 'mongodb://localhost:27017' } = process.env;

interface ExpressContext {
  req: { user?: JwtUser };
}

async function bootstrap() {
  await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });

  const schema = buildSchemaSync({
    resolvers,
    globalMiddlewares: [TypegooseMiddleware],
    authChecker: ({ context }) => !!context.jwtUser,
  });

  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    context({ req }: ExpressContext): Context {
      const jwtUser = req.user;
      return { jwtUser, user: jwtUser && UserService.getUser(jwtUser.sub) };
    },
  });

  await server.start();

  const app = express();
  app.use(JwtService.middleware);
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
}

bootstrap();
