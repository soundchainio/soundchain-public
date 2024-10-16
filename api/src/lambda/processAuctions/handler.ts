import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import { UserModel } from '../../models/User';
import { Context } from '../../types/Context';

export const processAuctions: Handler = async () => {
  const url =
    'mongodb://production:8uV53MWUu6DPfdL5@db-soundchain-api-production.cluster-capqvzyh8vvd.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false';
  await mongoose.connect(url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
  });

  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });

  await context.auctionItemService.processAuctions();
};
