import webPush from 'web-push';
import { Context } from '../types/Context';
import { Service } from './Service';

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    type?: string;
    [key: string]: any;
  };
}

export class WebPushService extends Service {
  private isConfigured: boolean = false;

  constructor(context: Context) {
    super(context);

    // Configure VAPID if keys are present
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (publicKey && privateKey) {
      webPush.setVapidDetails(
        'mailto:support@soundchain.io',
        publicKey,
        privateKey
      );
      this.isConfigured = true;
      console.log('[WebPushService] VAPID configured');
    } else {
      console.warn('[WebPushService] VAPID keys not configured - push notifications disabled');
    }
  }

  /**
   * Get the VAPID public key for frontend subscription
   */
  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Send a push notification to a user (all their subscribed devices)
   */
  async sendNotification(profileId: string, payload: WebPushPayload): Promise<void> {
    if (!this.isConfigured) {
      console.warn('[WebPushService] Cannot send push - VAPID not configured');
      return;
    }

    const subscriptions = await this.context.pushSubscriptionService.getSubscriptionsByProfileId(profileId);

    if (subscriptions.length === 0) {
      return; // User has no push subscriptions
    }

    // Add default icon and badge
    const fullPayload: WebPushPayload = {
      ...payload,
      icon: payload.icon || '/favicons/android-chrome-192x192.png',
      badge: payload.badge || '/favicons/favicon-32x32.png',
    };

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          JSON.stringify(fullPayload)
        );
      } catch (err: any) {
        // Handle invalid subscriptions (410 Gone, 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[WebPushService] Removing invalid subscription: ${sub.endpoint.substring(0, 50)}...`);
          await this.context.pushSubscriptionService.removeByEndpoint(sub.endpoint);
        } else {
          console.error(`[WebPushService] Error sending push:`, err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send push notification for a new follower
   */
  async notifyNewFollower(profileId: string, followerName: string, followerHandle: string): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'New Follower',
      body: `${followerName} started following you`,
      data: { url: `/profiles/${followerHandle}`, type: 'follower' }
    });
  }

  /**
   * Send push notification for a new like
   */
  async notifyNewLike(profileId: string, likerName: string, postId: string): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'New Like',
      body: `${likerName} liked your post`,
      data: { url: `/dex/post/${postId}`, type: 'reaction' }
    });
  }

  /**
   * Send push notification for a new comment
   */
  async notifyNewComment(profileId: string, commenterName: string, postId: string): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'New Comment',
      body: `${commenterName} commented on your post`,
      data: { url: `/dex/post/${postId}`, type: 'comment' }
    });
  }

  /**
   * Send push notification for a new DM
   */
  async notifyNewDM(profileId: string, senderName: string, senderHandle: string): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'New Message',
      body: `${senderName} sent you a message`,
      data: { url: `/dex/messages`, type: 'dm' }
    });
  }

  /**
   * Send push notification for OGUN earned
   */
  async notifyOgunEarned(profileId: string, amount: number, trackTitle: string, isCreator: boolean): Promise<void> {
    const role = isCreator ? 'Creator' : 'Listener';
    await this.sendNotification(profileId, {
      title: `${amount.toFixed(2)} OGUN Earned!`,
      body: `You earned OGUN as a ${role.toLowerCase()} from "${trackTitle}"`,
      data: { url: `/dex/wallet`, type: 'ogun' }
    });
  }

  /**
   * Send push notification for a tip received
   */
  async notifyTipReceived(profileId: string, tipperName: string, amount: number): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'Tip Received!',
      body: `${tipperName} tipped you ${amount} OGUN`,
      data: { url: `/dex/wallet`, type: 'tip' }
    });
  }

  /**
   * Send push notification for NFT sale
   */
  async notifyNFTSold(profileId: string, trackTitle: string, price: number): Promise<void> {
    await this.sendNotification(profileId, {
      title: 'NFT Sold!',
      body: `Your NFT "${trackTitle}" sold for ${price} OGUN`,
      data: { url: `/dex/wallet`, type: 'sale' }
    });
  }

  /**
   * Send push notification for stream milestone
   */
  async notifyStreamMilestone(profileId: string, trackTitle: string, milestone: number): Promise<void> {
    const formattedMilestone = milestone >= 1000
      ? `${(milestone / 1000).toFixed(0)}K`
      : milestone.toString();
    await this.sendNotification(profileId, {
      title: `${formattedMilestone} Streams!`,
      body: `"${trackTitle}" hit ${formattedMilestone} streams!`,
      data: { url: `/dex/dashboard`, type: 'milestone' }
    });
  }
}
