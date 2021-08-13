import { ClientOnlyPortal } from 'components/ClientOnlyPortal';
import { ReactChild } from 'react';

interface BottomSheetProps {
  children: ReactChild | ReactChild[];
}

export const BottomSheet = ({ children }: BottomSheetProps) => {
  return <ClientOnlyPortal selector="#bottom-sheet">{children}</ClientOnlyPortal>;
};
