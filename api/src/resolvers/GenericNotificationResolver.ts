import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { GenericNotification } from '../types/GenericNotification';

/**
 * Resolver for GenericNotification — provides basic fields for any
 * notification type that doesn't have a dedicated resolver.
 */
@Resolver(GenericNotification)
export class GenericNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  body(@Root() { type }: Notification): string {
    // Map type to a human-readable action
    const actions: Record<string, string> = {
      Repost: 'reposted your post',
      Mention: 'mentioned you',
      DirectMessage: 'sent you a message',
      Tip: 'sent you a tip',
      MarketplaceOffer: 'made an offer on your NFT',
      TrackComment: 'commented on your track',
      NewTrack: 'uploaded a new track',
      PlaylistAdded: 'added your track to a playlist',
      StreamMilestone: 'hit a stream milestone',
      StoryReaction: 'reacted to your story',
      StoryView: 'viewed your story',
      StoryReply: 'replied to your story',
      OgunEarnedCreator: 'you earned OGUN from streams',
      OgunEarnedListener: 'you earned OGUN from listening',
      OgunEarnedCollaborator: 'you earned OGUN as collaborator',
    };
    return actions[type] || 'sent you a notification';
  }

  @FieldResolver(() => String)
  link(@Root() { type, metadata }: Notification): string {
    // Best-effort link based on metadata
    const meta = metadata as unknown as Record<string, unknown> | undefined;
    if (meta?.link) return meta.link as string;
    if (meta?.postId) return `/posts/${meta.postId}`;
    if (meta?.trackId) return `/dex/track/${meta.trackId}`;
    if (type === 'DirectMessage') return '/dex/pulse';
    if (type === 'Tip') return '/wallet';
    if (type?.startsWith('OgunEarned')) return '/wallet';
    if (type?.startsWith('Story')) return '/dex/feed';
    return '/dex';
  }
}
