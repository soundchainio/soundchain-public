import { Label } from 'components/Label';
import { Refresh } from 'icons/Refresh';

interface RefreshButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  refreshing?: boolean;
}

export const RefreshButton = ({ onClick, label, className, refreshing }: RefreshButtonProps) => {
  return (
    <button className={`${className} flex flex-col items-center cursor-pointer`} onClick={onClick}>
      <span className={refreshing ? 'animate-spin' : ''}>
        <Refresh />
      </span>
      <Label textSize="xs" className="pt-1 font-semibold">
        {label || 'Refresh'}
      </Label>
    </button>
  );
};
