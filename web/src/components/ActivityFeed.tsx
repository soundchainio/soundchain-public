import { useState } from 'react';
import { Avatar } from './Avatar';
import { Timestamp } from './Timestamp';
import { Play, Heart, MessageCircle, UserPlus, Music, FileText } from 'lucide-react';
import Link from 'next/link';

// Activity types matching backend enum
type ActivityType = 'Listened' | 'Liked' | 'Commented' | 'Followed' | 'Minted' | 'Posted';

interface ActivityMetadata {
  trackId?: string;
  trackTitle?: string;
  artistName?: string;
  artworkUrl?: string;
  postId?: string;
  postBody?: string;
  commentBody?: string;
  followedProfileId?: string;
  followedDisplayName?: string;
  followedHandle?: string;
  editionId?: string;
  quantity?: number;
  hasMedia?: boolean;
}

interface ActivityProfile {
  id: string;
  displayName: string;
  profilePicture?: string;
  userHandle: string;
  isOnline?: boolean;
}

interface Activity {
  id: string;
  type: ActivityType;
  metadata?: ActivityMetadata;
  createdAt: string;
  profile: ActivityProfile;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'Listened':
      return <Play className="w-4 h-4 text-green-500" />;
    case 'Liked':
      return <Heart className="w-4 h-4 text-pink-500" />;
    case 'Commented':
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'Followed':
      return <UserPlus className="w-4 h-4 text-purple-500" />;
    case 'Minted':
      return <Music className="w-4 h-4 text-yellow-500" />;
    case 'Posted':
      return <FileText className="w-4 h-4 text-cyan-500" />;
    default:
      return null;
  }
};

const getActivityMessage = (activity: Activity): React.ReactNode => {
  const { type, metadata, profile } = activity;
  const name = profile.displayName;

  switch (type) {
    case 'Listened':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> listened to </span>
          <span className="text-white">{metadata?.trackTitle || 'a track'}</span>
          {metadata?.artistName && (
            <span className="text-gray-400"> by {metadata.artistName}</span>
          )}
        </>
      );
    case 'Liked':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> liked a post</span>
          {metadata?.postBody && (
            <span className="text-gray-500"> "{metadata.postBody.substring(0, 40)}..."</span>
          )}
        </>
      );
    case 'Commented':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> commented</span>
          {metadata?.commentBody && (
            <span className="text-gray-500"> "{metadata.commentBody.substring(0, 40)}..."</span>
          )}
        </>
      );
    case 'Followed':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> followed </span>
          <span className="text-white">{metadata?.followedDisplayName || 'someone'}</span>
        </>
      );
    case 'Minted':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> minted </span>
          <span className="text-white">{metadata?.trackTitle || 'an NFT'}</span>
          {metadata?.quantity && metadata.quantity > 1 && (
            <span className="text-gray-400"> ({metadata.quantity} editions)</span>
          )}
        </>
      );
    case 'Posted':
      return (
        <>
          <span className="font-semibold text-white">{name}</span>
          <span className="text-gray-400"> posted</span>
          {metadata?.hasMedia && <span className="text-gray-500"> (with media)</span>}
          {metadata?.postBody && (
            <span className="text-gray-500"> "{metadata.postBody.substring(0, 40)}..."</span>
          )}
        </>
      );
    default:
      return <span className="font-semibold text-white">{name}</span>;
  }
};

const getActivityLink = (activity: Activity): string | null => {
  const { type, metadata, profile } = activity;

  switch (type) {
    case 'Listened':
      return metadata?.trackId ? `/dex/track/${metadata.trackId}` : null;
    case 'Liked':
    case 'Commented':
    case 'Posted':
      return metadata?.postId ? `/dex/post/${metadata.postId}` : null;
    case 'Followed':
      return metadata?.followedHandle ? `/profiles/${metadata.followedHandle}` : null;
    case 'Minted':
      return metadata?.trackId ? `/dex/track/${metadata.trackId}` : null;
    default:
      return `/profiles/${profile.userHandle}`;
  }
};

export const ActivityItem = ({ activity }: { activity: Activity }) => {
  const link = getActivityLink(activity);

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-800/50 transition-colors">
      <Avatar
        profile={activity.profile}
        pixels={40}
        showOnlineIndicator={true}
        linkToProfile={true}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getActivityIcon(activity.type)}
          <p className="text-sm truncate">{getActivityMessage(activity)}</p>
        </div>
        <Timestamp datetime={activity.createdAt} className="text-xs text-gray-500 mt-1" />
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export const ActivityFeed = ({ activities, loading, hasMore, onLoadMore }: ActivityFeedProps) => {
  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No activity yet</p>
        <p className="text-sm mt-1">Follow some artists to see their activity here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
