import '01/../reflect-metadata';
import {
  ApolloServerPluginLandingPageGraphQLPlayground,
  ApolloServerPluginLandingPageProductionDefault,
} from 'apollo-server-core';
import cors from 'cors';
import * as dotenv from 'dotenv-flow';
import fs from 'fs';
import { buildSchemaSync } from 'type-graphql';
import { TypegooseMiddleware } from './middlewares/typegoose-middleware';
import { resolvers } from './resolvers';
import { JwtService, JwtUser } from './services/JwtService';
import { Context } from './types/Context';
import { SentryReportError } from './utils/SentryReportError';

dotenv.config();

interface ExpressContext {
  req: { user?: JwtUser };
}

interface LambdaContext {
  express: ExpressContext;
}

export const {
  NODE_ENV,
  PORT = 4000,
  DATABASE_URL = 'mongodb://localhost:27017',
  DATABASE_SSL_PATH,
  WEB_APP_URL = 'http://localhost:3000',
  SENDGRID_SENDER_EMAIL,
  SENTRY_URL,
  SENDGRID_VERIFICATION_TEMPLATE,
  SENDGRID_RESET_PASSWORD_TEMPLATE,
  SENDGRID_API_KEY,
  UPLOADS_BUCKET_REGION,
  UPLOADS_BUCKET_NAME,
  SQS_URL,
  CONTRACT_ADDRESS = '0x69CEf6953750a3Ed91B973Df524236215468Aacc',
  WALLET_PUBLIC_KEY,
  WALLET_PRIVATE_KEY,
  ALCHEMY_API_KEY,
  PINATA_API_KEY,
  PINATA_API_SECRET,
  MUX_TOKEN_ID,
  MUX_TOKEN_SECRET,
  MUX_WEBHOOK_SECRET,
} = process.env;

function assertEnvVar(name: string, value: string | undefined): asserts value {
  if (value === undefined) {
    throw new Error(`${name} env var must be set`);
  }
}

assertEnvVar('SENDGRID_SENDER_EMAIL', SENDGRID_SENDER_EMAIL);
assertEnvVar('SENDGRID_VERIFICATION_TEMPLATE', SENDGRID_VERIFICATION_TEMPLATE);
assertEnvVar('SENDGRID_API_KEY', SENDGRID_API_KEY);
assertEnvVar('SENDGRID_RESET_PASSWORD_TEMPLATE', SENDGRID_RESET_PASSWORD_TEMPLATE);
assertEnvVar('MUX_WEBHOOK_SECRET', MUX_WEBHOOK_SECRET);

export const config = {
  apollo: {
    plugins: [
      NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageProductionDefault()
        : ApolloServerPluginLandingPageGraphQLPlayground(),
      NODE_ENV === ('production' || 'staging') ? SentryReportError : {},
    ],
    context(context: ExpressContext | LambdaContext): Context {
      return new Context('req' in context ? context.req.user : context.express.req.user);
    },
    schema: buildSchemaSync({
      resolvers,
      globalMiddlewares: [TypegooseMiddleware],
      authChecker: ({ context }) => Boolean(context.user),
    }),
  },
  uploads: {
    region: UPLOADS_BUCKET_REGION,
    bucket: UPLOADS_BUCKET_NAME,
  },
  db: {
    url: DATABASE_URL,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && fs.readFileSync(`${__dirname}/${DATABASE_SSL_PATH}`).toString(),
      retryWrites: false,
    },
  },
  express: {
    port: PORT,
    middlewares: [cors({ credentials: true }), JwtService.middleware],
  },
  sendgrid: {
    apiKey: SENDGRID_API_KEY,
    sender: SENDGRID_SENDER_EMAIL,
    templates: {
      userEmailVerification: SENDGRID_VERIFICATION_TEMPLATE,
      passwordReset: SENDGRID_RESET_PASSWORD_TEMPLATE,
    },
  },
  web: {
    url: WEB_APP_URL,
  },
  minting: {
    contractAddress: CONTRACT_ADDRESS,
    pinataKey: PINATA_API_KEY,
    pinataSecret: PINATA_API_SECRET,
    walletPrivateKey: WALLET_PRIVATE_KEY,
    walletPublicKey: WALLET_PUBLIC_KEY,
    alchemyKey: ALCHEMY_API_KEY,
    sqsUrl: SQS_URL,
  },
  mux: {
    tokenId: MUX_TOKEN_ID,
    tokenSecret: MUX_TOKEN_SECRET,
    webhookSecret: MUX_WEBHOOK_SECRET,
  },
  sentry: {
    url: SENTRY_URL,
  },
};
