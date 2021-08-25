import { useNotificationCountQuery } from 'lib/graphql';

export const NotificationBadge = () => {
  const { data } = useNotificationCountQuery({ fetchPolicy: 'no-cache' });

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
