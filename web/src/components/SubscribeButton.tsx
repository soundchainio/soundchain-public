import { useMe } from 'hooks/useMe';
import { SubscribeBell } from 'icons/SubscribeBell';
import { useSubscribeToProfileMutation, useUnsubscribeFromProfileMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';

interface SubscribeButtonProps {
  profileId: string;
  isSubscriber: boolean;
}

export const SubscribeButton = ({ profileId, isSubscriber }: SubscribeButtonProps) => {
  const [subscribeProfile, { loading: subscribeLoading }] = useSubscribeToProfileMutation();
  const [unsubscribeProfile, { loading: unsubscribeLoading }] = useUnsubscribeFromProfileMutation();
  const router = useRouter();
  const me = useMe();

  const handleClick = async () => {
    if (subscribeLoading || unsubscribeLoading) {
      return;
    }

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } });
      return;
    }

    const opts = { variables: { input: { profileId } } };

    if (!isSubscriber) {
      await subscribeProfile(opts);
    } else {
      await unsubscribeProfile(opts);
    }
  };

  if (me?.profile.id === profileId) {
    return null;
  }

  return (
    <div onClick={handleClick}>
      <SubscribeBell isSubscriber={isSubscriber} />
    </div>
  );
};
