import { useClearNotificationsMutation } from 'lib/graphql';
import { Button } from './Button';

export const ClearAllNotificationsButton = () => {
  const [clearNotification, { loading }] = useClearNotificationsMutation({ refetchQueries: ['Notifications'] });

  const onClick = () => {
    clearNotification();
  };

  return (
    <Button variant="clear" onClick={onClick} disabled={loading}>
      Clear All
    </Button>
  );
};
