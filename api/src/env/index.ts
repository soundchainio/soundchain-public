import * as dotenv from 'dotenv-flow';

dotenv.config();

export const {
  PORT = 4000,
  DATABASE_URL = 'mongodb://localhost:27017',
  WEB_APP_URL = 'http://localhost:3000',
  SENDGRID_SENDER_EMAIL = 'caaina@ae.studio',
  SENDGRID_VERIFICATION_TEMPLATE = 'd-30c856476a8e4dcfa97d93ca08fc680d',
  SENDGRID_API_KEY = 'SG.example',
} = process.env;
