import { Button } from 'components/Button';
import { ConfirmationDialog } from 'components/modals/ConfirmationDialog';
import { useMe } from 'hooks/useMe';
import { Checkmark } from 'icons/Checkmark';
import { useFollowProfileMutation, useUnfollowProfileMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

interface FollowButtonProps {
  followedId: string;
  isFollowed: boolean;
  showIcon?: boolean;
  followedHandle: string;
}

export const FollowButton = ({ followedId, isFollowed, showIcon, followedHandle }: FollowButtonProps) => {
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation();
  const [showDialog, setShowDialog] = useState(false);
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation();
  const router = useRouter();
  const me = useMe();
  const opts = { variables: { input: { followedId } }, refetchQueries: ['ProfileByHandle', 'Followers', 'Following'] };

  const handleClick = async () => {
    if (followLoading || unfollowLoading) {
      return;
    }

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } });
      return;
    }

    if (!isFollowed) {
      await followProfile(opts);
    } else {
      setShowDialog(true);
    }
    router.replace(router.asPath);
  };

  if (me?.profile.id === followedId) {
    return null;
  }

  const handleUnfollowConfirmation = async () => {
    await unfollowProfile(opts);
    setShowDialog(false);
  };

  const icon = showIcon ? () => <Checkmark color={!isFollowed ? 'green' : undefined} /> : null;

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outline-rounded"
        borderColor="bg-green-gradient"
        bgColor={isFollowed ? 'bg-green-gradient' : undefined}
        className="w-[85px] py-1 bg-gray-10 text-sm"
        textColor={isFollowed ? 'text-white' : 'green-gradient-text'}
        icon={icon}
      >
        {isFollowed ? 'Following' : 'Follow'}
      </Button>
      <ConfirmationDialog
        onConfirm={handleUnfollowConfirmation}
        confirmText={'Unfollow'}
        cancelText={'Cancel'}
        title={'Unfollow @' + followedHandle + '?'}
        description={'Their posts will no longer show up in your home feed. You still can view their profile.'}
        showDialog={showDialog}
        setShowDialog={setShowDialog}
      />
    </>
  );
};
