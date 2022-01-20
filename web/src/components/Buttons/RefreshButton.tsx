import { Refresh } from 'icons/Refresh';
import { TopNavBarButton } from '../TopNavBarButton';

interface RefreshButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export const RefreshButton = ({ onClick, label, className }: RefreshButtonProps) => {
  return <TopNavBarButton onClick={onClick} label={label ? label : 'Refresh'} icon={Refresh} className={className} />;
};
