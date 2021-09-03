import classNames from 'classnames';
import { IconProps } from 'icons/types/IconProps';
import { Label } from './Label';

interface RefreshButtonProps {
  onClick: () => void;
  icon: (props: IconProps) => JSX.Element;
  label: string;
  className?: string;
}

export const TopNavBarButton = ({ onClick, icon: Icon, label, className }: RefreshButtonProps) => {
  return (
    <div
      className={classNames(className, 'flex flex-col items-center cursor-pointer focus:ring-2 focus:ring-blue-600')}
      onClick={onClick}
    >
      <Icon />
      <Label textSize="xs" className="pt-1 font-semibold">
        {label}
      </Label>
    </div>
  );
};
