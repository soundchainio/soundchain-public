import '01/../reflect-metadata';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { buildSchemaSync } from 'type-graphql';
import { DATABASE_URL, PORT } from './env';
import { TypegooseMiddleware } from './middlewares/typegoose-middleware';
import resolvers from './resolvers';
import { EmailService } from './services/EmailService';
import JwtService, { JwtUser } from './services/JwtService';
import { UserService } from './services/UserService';
import Context from './types/Context';

interface ExpressContext {
  req: { user?: JwtUser };
}

async function bootstrap() {
  await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

  const schema = buildSchemaSync({
    resolvers,
    globalMiddlewares: [TypegooseMiddleware],
    authChecker: ({ context }) => Boolean(context.jwtUser),
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

  EmailService.initialize();

  const app = express();
  app.use(JwtService.middleware);
  server.applyMiddleware({ app });

  await new Promise<void>(resolve => app.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
}

bootstrap();
