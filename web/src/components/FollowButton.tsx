import { Button } from 'components/Button';
import { is } from 'date-fns/locale';
import { useMe } from 'hooks/useMe';
import { Checkmark } from 'icons/Checkmark';
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
    <Button
      onClick={handleClick}
      variant="outline-rounded"
      borderColor="bg-green-gradient"
      bgColor={isFollowed ? 'bg-green-gradient' : undefined}
      className="w-[90px] bg-gray-10 text-sm"
      textColor={isFollowed ? 'text-white' : 'green-gradient-text'}
      icon={() => <Checkmark activatedColor={!isFollowed ? 'green' : undefined} />}
    >
      {isFollowed ? 'Following' : 'Follow'}
    </Button>
  );
};
