import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import { config } from '../config';
import { UserModel } from '../models/User';
import { Context } from '../types/Context';

export const processAuctions: Handler = async () => {
  await mongoose.connect(config.db.url, config.db.options);

  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id });

  await context.auctionItemService.processAuctions();
};
