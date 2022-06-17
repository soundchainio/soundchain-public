import { useMe } from 'hooks/useMe';
import { SubscribeBell } from 'icons/SubscribeBell';
import { useSubscribeToProfileMutation, useUnsubscribeFromProfileMutation } from 'lib/graphql';
import { useRouter } from 'next/router';

interface SubscribeButtonProps {
  profileId: string;
  isSubscriber: boolean;
  small?: boolean;
}

export const SubscribeButton = ({ profileId, isSubscriber, small = false }: SubscribeButtonProps) => {
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
    router.replace(router.asPath);
  };

  if (me?.profile.id === profileId) {
    return null;
  }

  return (
    <button onClick={handleClick} className={`flex-shrink-0 ${small === false ? 'h-9 w-9' : 'h-5 w-5'}`}>
      <SubscribeBell isSubscriber={isSubscriber} />
    </button>
  );
};
