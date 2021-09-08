import { useModalState } from 'contexts/providers/modal';
import { Profile, useFollowersLazyQuery, useFollowingLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { FollowItem } from './FollowItem';
import { InfiniteLoader } from './InfiniteLoader';
import { Modal } from './Modal';

interface FollowersModal {
  profileId: string;
  modalType: FollowModalType;
  onClose: () => void;
}

export const FollowModal = ({ profileId, modalType, onClose }: FollowersModal) => {
  const { showFollowModal } = useModalState();
  const [followers, { data: followersData, fetchMore: fetchMoreFollowers }] = useFollowersLazyQuery({
    variables: { profileId },
  });
  const [following, { data: followingData, fetchMore: fetchMoreFollowing }] = useFollowingLazyQuery({
    variables: { profileId },
  });

  useEffect(() => {
    if (showFollowModal) {
      if (modalType === FollowModalType.FOLLOWERS) {
        followers();
      } else {
        following();
      }
    }
  }, [showFollowModal]);

  const onLoadMore = () => {
    if (modalType === FollowModalType.FOLLOWERS && fetchMoreFollowers) {
      fetchMoreFollowers({ variables: { profileId, page: { after: followersData?.followers.pageInfo.endCursor } } });
    } else if (fetchMoreFollowing) {
      fetchMoreFollowing({ variables: { profileId, page: { after: followingData?.following.pageInfo.endCursor } } });
    }
  };

  return (
    <Modal
      show={showFollowModal}
      title={
        modalType === FollowModalType.FOLLOWERS
          ? `Followers (${followersData?.followers.pageInfo.totalCount})`
          : `Following (${followingData?.following.pageInfo.totalCount})`
      }
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={onClose}>
          Close
        </div>
      }
    >
      <div className="flex flex-col h-full pb-32 overflow-y-auto bg-gray-30 px-4 py-2 ">
        {modalType === FollowModalType.FOLLOWERS && (
          <div className="pb-10">
            <div className="space-y-6">
              {followersData?.followers.nodes.map(follower => (
                <FollowItem key={follower.id} profile={follower.followerProfile as Profile} />
              ))}
            </div>
            {followersData?.followers.pageInfo.hasNextPage && (
              <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Followers" />
            )}
          </div>
        )}
        {modalType === FollowModalType.FOLLOWING && (
          <div className="pb-10">
            <div className="space-y-6">
              {followingData?.following.nodes.map(following => (
                <FollowItem key={following.id} profile={following.followedProfile as Profile} />
              ))}
            </div>
            {followingData?.following.pageInfo.hasNextPage && (
              <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Following" />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
