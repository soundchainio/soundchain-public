import * as Apollo from '@apollo/client';
import { Refresh } from 'icons/Refresh';
import { apolloClient } from 'lib/apollo';
import { TopNavBarButton } from '../TopNavBarButton';

interface RefreshButtonProps {
  queryDocument: Apollo.DocumentNode;
}

export const RefreshButton = ({ queryDocument }: RefreshButtonProps) => {
  const onClick = () => {
    apolloClient.refetchQueries({ include: [queryDocument] });
  };

  return <TopNavBarButton onClick={onClick} label="Refresh" icon={Refresh} />;
};
