import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { UserInputError } from 'apollo-server-errors';
import { FilterQuery } from 'mongoose';
import { Profile } from '../models/Profile';
import { Subscription, SubscriptionModel } from '../models/Subscription';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface SubscriptionKeyComponents {
  subscriberId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
}

export class SubscriptionService extends ModelService<typeof Subscription, SubscriptionKeyComponents> {
  constructor(context: Context) {
    super(context, SubscriptionModel);
  }

  keyIteratee = ({ subscriberId, profileId }: Partial<DocumentType<Subscription>>): string => {
    return `${subscriberId.toString()}:${profileId.toString()}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<Subscription> {
    return {
      $or: keys.map(key => {
        const [subscriberId, profileId] = key.split(':');
        return { subscriberId: new mongoose.Types.ObjectId(subscriberId), profileId: new mongoose.Types.ObjectId(profileId) };
      }),
    };
  }

  async subscribeProfile(subscriberId: string, profileId: string): Promise<Profile> {
    if (subscriberId === profileId) {
      throw new UserInputError('You cannot subscribe to your own profile.');
    }

    const [subscribedProfile, alreadySubscribed] = await Promise.all([
      this.context.profileService.findOrFail(profileId),
      this.exists({ subscriberId: new mongoose.Types.ObjectId(subscriberId), profileId: new mongoose.Types.ObjectId(profileId) }),
    ]);

    if (alreadySubscribed) {
      throw new UserInputError(`User profile ${subscriberId} is already subscribing profile ${profileId}.`);
    }

    const subscription = new this.model({ subscriberId, profileId });
    await subscription.save();
    this.dataLoader.clear(this.getKeyFromComponents(subscription));
    return subscribedProfile;
  }

  async unsubscribeProfile(subscriberId: string, profileId: string): Promise<Profile> {
    const subscribedProfile = await this.context.profileService.findOrFail(profileId);
    const { deletedCount } = await SubscriptionModel.deleteOne({
      subscriberId,
      profileId,
    });

    if (deletedCount === 0) {
      throw new UserInputError(`User profile ${subscriberId} isn't subscribing profile ${profileId}.`);
    }

    this.dataLoader.clear(this.getKeyFromComponents({ subscriberId: new mongoose.Types.ObjectId(subscriberId), profileId: new mongoose.Types.ObjectId(profileId) }));

    return subscribedProfile;
  }

  async getSubscriberIds(profileId: string): Promise<string[]> {
    // Use .lean() to get plain objects and avoid mongoose document symbol issues
    const subscriptions = await this.model.find({ profileId }, { subscriberId: 1, _id: 0 }).lean();
    return subscriptions.map(({ subscriberId }) => subscriberId?.toString() || '').filter(Boolean);
  }
}
