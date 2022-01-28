import { Refresh } from 'icons/Refresh';

interface RefreshButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  refreshing?: boolean;
}

export const RefreshButton = ({ onClick, label, className, refreshing }: RefreshButtonProps) => {
  return (
    <button className={`${className} flex flex-col items-center`} onClick={onClick}>
      <span className={refreshing ? 'animate-spin' : ''}>
        <Refresh />
      </span>
      <span className="text-gray-60 pt-1 font-semibold text-xs">{label || 'Refresh'}</span>
    </button>
  );
};
