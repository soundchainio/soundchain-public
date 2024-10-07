import 'reflect-metadata';

import { APIGatewayProxyHandler } from 'aws-lambda';
import { config } from '../../config';
import { mongoose } from '@typegoose/typegoose';

export const handler: APIGatewayProxyHandler = async event => {
  console.log('Connecting to MongoDB');
  console.log(config.db.url);
  console.log(config.db.options);
  await mongoose.connect(config.db.url, config.db.options);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from Lambda!' as const,
    }),
  };
};
