import { mongoose } from '@typegoose/typegoose';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    const url =
      'mongodb://production:8uV53MWUu6DPfdL5@db-soundchain-api-production.cluster-capqvzyh8vvd.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false';
    await mongoose.connect(url, { useUnifiedTopology: true, useNewUrlParser: true });
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
