import { Button } from 'components/Button';
import { useFollowProfileMutation } from 'lib/graphql';
import React from 'react';

interface FollowButtonProps {
  followedId: string;
  isFollowed: boolean;
}

export const FollowButton = ({ followedId, isFollowed }: FollowButtonProps) => {
  const [followProfile] = useFollowProfileMutation();

  const handleClick = async () => {
    // if (!isFollowed) {
    await followProfile({ variables: { input: { followedId } } });
    // }
  };

  return (
    <Button onClick={handleClick} variant="rainbow-rounded" className="w-20 bg-gray-10 text-sm">
      {isFollowed ? 'Unfollow' : 'Follow'}
    </Button>
  );
};
