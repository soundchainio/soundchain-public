import * as Apollo from '@apollo/client';
import { Refresh } from 'icons/Refresh';
import { apolloClient } from 'lib/apollo';
import { Label } from './Label';

interface RefreshButtonProps {
  queryDocument: Apollo.DocumentNode;
}

export const RefreshButton = ({ queryDocument }: RefreshButtonProps) => {
  const onClick = () => {
    apolloClient.refetchQueries({ include: [queryDocument] });
  };

  return (
    <div className="flex flex-col items-center" onClick={onClick}>
      <Refresh />
      <Label small className="pt-1">
        Refresh
      </Label>
    </div>
  );
};
