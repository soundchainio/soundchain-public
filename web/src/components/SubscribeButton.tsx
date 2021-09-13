import { useMe } from 'hooks/useMe';
import { SubscribeBell } from 'icons/SubscribeBell';
import { useSubscribeProfileMutation, useUnsubscribeProfileMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';

interface SubscribeButtonProps {
  subscribedProfileId: string;
  isSubscriber: boolean;
}

export const SubscribeButton = ({ subscribedProfileId, isSubscriber }: SubscribeButtonProps) => {
  const [subscribeProfile, { loading: subscribeLoading }] = useSubscribeProfileMutation();
  const [unsubscribeProfile, { loading: unsubscribeLoading }] = useUnsubscribeProfileMutation();
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

    const opts = { variables: { input: { subscribedProfileId } } };

    if (!isSubscriber) {
      await subscribeProfile(opts);
    } else {
      await unsubscribeProfile(opts);
    }
  };

  if (me?.profile.id === subscribedProfileId) {
    return null;
  }

  return (
    <div onClick={handleClick}>
      <SubscribeBell isSubscriber={isSubscriber} />
    </div>
  );
};
