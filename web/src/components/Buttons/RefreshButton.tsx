import { Refresh } from 'icons/Refresh';
import { TopNavBarButton } from '../TopNavBarButton';

interface RefreshButtonProps {
  onClick: () => void;
}

export const RefreshButton = ({ onClick }: RefreshButtonProps) => {
  return <TopNavBarButton onClick={onClick} label="Refresh" icon={Refresh} />;
};
