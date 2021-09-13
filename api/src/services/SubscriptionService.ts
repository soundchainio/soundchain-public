import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-errors';
import { FilterQuery } from 'mongoose';
import { Subscription, SubscriptionModel } from '../models/Subscription';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface SubscriptionKeyComponents {
  profileId: string;
  subscribedProfileId: string;
}

export class SubscriptionService extends ModelService<typeof Subscription, SubscriptionKeyComponents> {
  constructor(context: Context) {
    super(context, SubscriptionModel);
  }

  keyIteratee = ({
    profileId,
    subscribedProfileId,
  }: Partial<DocumentType<InstanceType<typeof Subscription>>>): string => {
    return `${profileId}:${subscribedProfileId}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Subscription> {
    return {
      $or: keys.map(key => {
        const [profileId, subscribedProfileId] = key.split(':');
        return { profileId, subscribedProfileId };
      }),
    };
  }

  async createSubscription(params: SubscriptionKeyComponents): Promise<Subscription> {
    const subscription = new this.model(params);
    await subscription.save();
    this.dataLoader.clear(this.getKeyFromComponents(subscription));
    return subscription;
  }

  async deleteSubscription(profileId: string, subscribedProfileId: string): Promise<void> {
    const { deletedCount } = await SubscriptionModel.deleteOne({ profileId, subscribedProfileId });

    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${profileId} isn't subscribing profile ${subscribedProfileId}.`);
    }

    this.dataLoader.clear(this.getKeyFromComponents({ profileId, subscribedProfileId }));
  }

  async getSubscribersIds(subscribedProfileId: string): Promise<string[]> {
    const rest = await this.model.find({ subscribedProfileId }, { profileId: 1, _id: 0 });
    return rest.map(({ profileId }) => profileId);
  }
}
