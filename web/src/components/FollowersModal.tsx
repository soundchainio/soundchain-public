import { DownArrow } from 'icons/DownArrow';
import { Profile, useFollowersLazyQuery, useFollowingLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { FollowItem } from './FollowItem';
import { InfiniteLoader } from './InfiniteLoader';
import { LoaderAnimation } from './LoaderAnimation';
import { Modal } from './Modal';

interface FollowersModal {
  show: boolean;
  profileId: string;
  modalType: FollowModalType;
  onClose: () => void;
}

export const FollowModal = ({ show, profileId, modalType, onClose }: FollowersModal) => {
  const [followers, { data: followersData, fetchMore: fetchMoreFollowers }] = useFollowersLazyQuery({
    variables: { profileId },
  });
  const [following, { data: followingData, fetchMore: fetchMoreFollowing }] = useFollowingLazyQuery({
    variables: { profileId },
  });

  useEffect(() => {
    if (show) {
      if (modalType === FollowModalType.FOLLOWERS) {
        followers();
      } else {
        following();
      }
    }
  }, [show]);

  const onLoadMore = () => {
    if (modalType === FollowModalType.FOLLOWERS && fetchMoreFollowers) {
      fetchMoreFollowers({ variables: { profileId, page: { after: followersData?.followers.pageInfo.endCursor } } });
    } else if (fetchMoreFollowing) {
      fetchMoreFollowing({ variables: { profileId, page: { after: followingData?.following.pageInfo.endCursor } } });
    }
  };

  const getTitle = () => {
    if (modalType === FollowModalType.FOLLOWERS) {
      return followersData ? `Followers (${followersData.followers.pageInfo.totalCount})` : `Followers`;
    }
    return followingData ? `Following (${followingData.following.pageInfo.totalCount})` : `Following`;
  };

  return (
    <Modal
      show={show}
      title={getTitle()}
      leftButton={
        <div className="flex justify-start ml-6">
          <button aria-label="Close" className="w-10 h-10 flex justify-center items-center" onClick={onClose}>
            <DownArrow />
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="bg-gray-25 h-full">
        {modalType === FollowModalType.FOLLOWERS && (
          <>
            {!followersData && (
              <div className="flex items-center">
                <LoaderAnimation loadingMessage="Loading Followers" />
              </div>
            )}
            <div className="space-y-6 px-4 py-3">
              {followersData?.followers.nodes.map(follower => (
                <FollowItem key={follower.id} profile={follower.followerProfile as Profile} />
              ))}
            </div>
            {followersData?.followers.pageInfo.hasNextPage && (
              <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Followers" />
            )}
          </>
        )}
        {modalType === FollowModalType.FOLLOWING && (
          <>
            {!followingData && (
              <div className="flex items-center">
                <LoaderAnimation loadingMessage="Loading Following" />
              </div>
            )}
            <div className="space-y-6 px-4 py-3">
              {followingData?.following.nodes.map(following => (
                <FollowItem key={following.id} profile={following.followedProfile as Profile} />
              ))}
            </div>
            {followingData?.following.pageInfo.hasNextPage && (
              <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Following" />
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
