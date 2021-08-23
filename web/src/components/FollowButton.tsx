import { Button } from 'components/Button';
import { useMe } from 'hooks/useMe';
import { useFollowProfileMutation, useUnfollowProfileMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';

interface FollowButtonProps {
  followedId: string;
  isFollowed: boolean;
}

export const FollowButton = ({ followedId, isFollowed }: FollowButtonProps) => {
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation();
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation();
  const router = useRouter();
  const me = useMe();

  const handleClick = async () => {
    if (followLoading || unfollowLoading) {
      return;
    }

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } });
      return;
    }

    const opts = { variables: { input: { followedId } } };

    if (!isFollowed) {
      await followProfile(opts);
    } else {
      await unfollowProfile(opts);
    }
  };

  if (me?.profile.id === followedId) {
    return null;
  }

  return (
    <Button onClick={handleClick} variant="rainbow-rounded" className="w-20 bg-gray-10 text-sm">
      {isFollowed ? 'Unfollow' : 'Follow'}
    </Button>
  );
};
