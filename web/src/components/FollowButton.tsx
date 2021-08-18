import { Button } from 'components/Button';
import { useFollowProfileMutation, useUnfollowProfileMutation } from 'lib/graphql';
import React from 'react';

interface FollowButtonProps {
  followedId: string;
  isFollowed: boolean;
}

export const FollowButton = ({ followedId, isFollowed }: FollowButtonProps) => {
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation();
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation();

  const handleClick = async () => {
    if (followLoading || unfollowLoading) return;
    const opts = { variables: { input: { followedId } } };

    if (!isFollowed) {
      await followProfile(opts);
    } else {
      await unfollowProfile(opts);
    }
  };

  return (
    <Button onClick={handleClick} variant="rainbow-rounded" className="w-20 bg-gray-10 text-sm">
      {isFollowed ? 'Unfollow' : 'Follow'}
    </Button>
  );
};
