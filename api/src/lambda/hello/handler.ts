import { APIGatewayProxyHandler } from 'aws-lambda';
import { mongoose } from '@typegoose/typegoose';
import { config } from '../../config';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(config.db.url, config.db.options);
    console.log('Successfully connected to MongoDB');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Hello from Lambda!' as const,
      }),
    };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};
