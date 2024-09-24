import 'reflect-metadata';

import { ApolloServerPluginLandingPageDisabled } from 'apollo-server-core';
import cors from 'cors';
import * as dotenv from 'dotenv-flow';
import fs from 'fs';
import { buildSchemaSync } from 'type-graphql';
import path from 'path';

import { TypegooseMiddleware } from './middlewares/typegoose-middleware';
import { resolvers } from './resolvers';
import { JwtService, JwtUser } from './services/JwtService';
import { Context } from './types/Context';

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
  WALLET_PUBLIC_KEY,
  WALLET_PRIVATE_KEY,
  ALCHEMY_API_KEY,
  PINATA_API_KEY,
  PINATA_API_SECRET,
  MUX_TOKEN_ID,
  MUX_TOKEN_SECRET,
  MAGIC_PRIVATE_KEY,
  MARKETPLACE_ADDRESS,
  MARKETPLACE_MULTIPLE_EDITION_ADDRESS,
  NFT_ADDRESS,
  NFT_MULTIPLE_EDITION_ADDRESS,
  MUX_DATA_ID,
  MUX_DATA_SECRET,
  POLYGON_SCAN_API_KEY,
  AUCTION_ADDRESS,
  AUCTION_V2_ADDRESS,
  MAILCHIMP_API_KEY,
  MAILCHIMP_TRANSACTIONAL_API_KEY,
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

export const config = {
  apollo: {
    plugins: [ApolloServerPluginLandingPageDisabled()],
    context(context: ExpressContext | LambdaContext): Context {
      return new Context('req' in context ? context.req.user : context.express.req.user);
    },
    schema: buildSchemaSync({
      resolvers,
      globalMiddlewares: [TypegooseMiddleware],
      authChecker: async ({ context }, roles) => {
        const user = await context.user;
        if (roles.length === 0) {
          return Boolean(user);
        }
        if (user.roles.some((role: string) => roles.includes(role))) {
          return true;
        }
        return false;
      },
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
      // ssl: true,
      // sslCA: fs.readFileSync('/opt/nodejs/global-bundle.pem').toString(),
      ssl: Boolean(DATABASE_SSL_PATH),
      sslCA: DATABASE_SSL_PATH && path.join(__dirname, 'src', DATABASE_SSL_PATH),
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
    pinataKey: PINATA_API_KEY,
    pinataSecret: PINATA_API_SECRET,
    walletPrivateKey: WALLET_PRIVATE_KEY,
    walletPublicKey: WALLET_PUBLIC_KEY,
    contractsV1: {
      marketplaceAddress: MARKETPLACE_ADDRESS,
      nftAddress: NFT_ADDRESS,
      auctionAddress: AUCTION_ADDRESS,
    },
    contractsV2: {
      marketplaceMultipleEditionAddress: MARKETPLACE_MULTIPLE_EDITION_ADDRESS,
      nftMultipleEditionAddress: NFT_MULTIPLE_EDITION_ADDRESS,
      auctionAddress: AUCTION_V2_ADDRESS,
    },
    alchemyKey: ALCHEMY_API_KEY,
    polygonScan: POLYGON_SCAN_API_KEY,
  },
  mux: {
    tokenId: MUX_TOKEN_ID,
    tokenSecret: MUX_TOKEN_SECRET,
  },
  muxData: {
    tokenId: MUX_DATA_ID,
    tokenSecret: MUX_DATA_SECRET,
  },
  sentry: {
    url: SENTRY_URL,
  },
  magicLink: {
    secretKey: MAGIC_PRIVATE_KEY,
  },
  env: {
    isProduction: process.env.NODE_ENV === 'production',
  },
  mailchimp: {
    apiKey: MAILCHIMP_API_KEY,
    transactionalApiKey: MAILCHIMP_TRANSACTIONAL_API_KEY,
  },
};
