import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import { UserModel } from '../../models/User';
import { Context } from '../../types/Context';

export const processPending: Handler = async () => {
  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id.toString() });

  const nowMinusOneHour = new Date();
  nowMinusOneHour.setHours(nowMinusOneHour.getHours() - 1);

  await Promise.all([
    context.trackService.resetPending(nowMinusOneHour),
    context.trackEditionService.resetPending(nowMinusOneHour),
    context.trackService.processPendingTrack(),
  ]);
};
