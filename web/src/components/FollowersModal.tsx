import { useModalState } from 'contexts/providers/modal';
import { Profile, useFollowersLazyQuery, useFollowingLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { FollowItem } from './FollowItem';
import { Modal } from './Modal';

interface FollowersModal {
  profileId: string;
  modalType: FollowModalType;
  onClose: () => void;
}

export const FollowModal = ({ profileId, modalType, onClose }: FollowersModal) => {
  const { showFollowModal } = useModalState();
  const [followers, { data: followersData }] = useFollowersLazyQuery({ variables: { profileId } });
  const [following, { data: followingData }] = useFollowingLazyQuery({ variables: { profileId } });

  useEffect(() => {
    if (showFollowModal) {
      if (modalType === FollowModalType.FOLLOWERS) {
        followers();
      } else {
        following();
      }
    }
  }, [showFollowModal]);

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
      {modalType === FollowModalType.FOLLOWERS && (
        <div className="flex flex-col h-full bg-gray-30 space-y-6 px-4 py-2">
          {followersData?.followers.nodes.map(follower => (
            <FollowItem key={follower.id} profile={follower.followerProfile as Profile} />
          ))}
        </div>
      )}
      {modalType === FollowModalType.FOLLOWING && (
        <div className="flex flex-col h-full bg-gray-30 space-y-6 px-4 py-2">
          {followingData?.following.nodes.map(following => (
            <FollowItem key={following.id} profile={following.followedProfile as Profile} />
          ))}
        </div>
      )}
    </Modal>
  );
};
