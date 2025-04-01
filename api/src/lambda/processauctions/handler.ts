import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import { UserModel } from '../../models/User';
import { Context } from '../../types/Context';

export const processAuctions: Handler = async () => {
  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id.toString() });

  await context.auctionItemService.processAuctions();
};
