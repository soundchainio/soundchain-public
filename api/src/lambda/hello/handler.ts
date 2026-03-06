import { mongoose } from '@typegoose/typegoose';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { config } from '../../config';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    // Use DATABASE_URL from serverless.yml environment variables
    const dbUrl = process.env.DATABASE_URL || config.db.url;
    console.log('Attempting to connect to MongoDB...');
    console.log('DB URL set:', !!dbUrl);
    console.log(config.db.options);
    await mongoose.connect(dbUrl, config.db.options);
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
