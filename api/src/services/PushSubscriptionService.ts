import { PushSubscription, PushSubscriptionModel } from '../models/PushSubscription';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface SubscribeInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceName?: string;
}

export class PushSubscriptionService extends ModelService<typeof PushSubscription> {
  constructor(context: Context) {
    super(context, PushSubscriptionModel);
  }

  /**
   * Subscribe a user to push notifications (upsert by endpoint)
   */
  async subscribe(profileId: string, input: SubscribeInput): Promise<PushSubscription> {
    const existing = await this.model.findOne({
      profileId,
      endpoint: input.endpoint
    });

    if (existing) {
      // Update keys if subscription already exists (resubscribe)
      existing.keys = input.keys;
      existing.userAgent = input.userAgent;
      existing.deviceName = input.deviceName;
      await existing.save();
      return existing.toObject() as PushSubscription;
    }

    // Create new subscription
    const subscription = new PushSubscriptionModel({
      profileId,
      ...input
    });
    await subscription.save();
    return subscription.toObject() as PushSubscription;
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(profileId: string, endpoint: string): Promise<boolean> {
    const result = await this.model.deleteOne({ profileId, endpoint });
    return result.deletedCount > 0;
  }

  /**
   * Remove a subscription by endpoint only (for invalid subscriptions)
   */
  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.model.deleteOne({ endpoint });
  }

  /**
   * Get all subscriptions for a user
   */
  async getSubscriptionsByProfileId(profileId: string): Promise<PushSubscription[]> {
    return this.model.find({ profileId }).lean() as unknown as PushSubscription[];
  }

  /**
   * Check if a user has any push subscriptions
   */
  async hasSubscriptions(profileId: string): Promise<boolean> {
    const count = await this.model.countDocuments({ profileId });
    return count > 0;
  }
}
