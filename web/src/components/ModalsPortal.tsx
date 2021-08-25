import { ClientOnlyPortal } from 'components/ClientOnlyPortal';
import { ReactChild } from 'react';

interface ModalsPortalProps {
  children: ReactChild | ReactChild[];
}

export const ModalsPortal = ({ children }: ModalsPortalProps) => {
  return <ClientOnlyPortal selector="#modals">{children}</ClientOnlyPortal>;
};
