import { useNotificationCountLazyQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export const NotificationBadge = () => {
  const [fetchNotificationCount, { data }] = useNotificationCountLazyQuery({ fetchPolicy: 'no-cache' });
  const router = useRouter();

  useEffect(() => {
    fetchNotificationCount();
  }, [router.pathname, fetchNotificationCount]);

  return (
    <>
      {data && data.myProfile.unreadNotificationCount > 0 && (
        <div className="absolute rounded-full bg-red-700 h-4 w-4 text-xs text-white font-semibold text-center -right-3 -top-1">
          <span>{data.myProfile.unreadNotificationCount}</span>
        </div>
      )}
    </>
  );
};
