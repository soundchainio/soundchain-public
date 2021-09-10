import { InboxBadge } from 'components/InboxBadge';
import { Inbox } from 'icons/Inbox';
import { useRouter } from 'next/router';
import { TopNavBarButton } from '../TopNavBarButton';

export const InboxButton = () => {
  const router = useRouter();

  const onClick = () => {
    router.push('/messages');
  };

  return (
    <div className="relative">
      <InboxBadge />
      <TopNavBarButton onClick={onClick} label="Inbox" icon={Inbox} />
    </div>
  );
};
