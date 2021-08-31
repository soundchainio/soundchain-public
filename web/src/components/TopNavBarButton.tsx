import { IconProps } from 'icons/types/IconProps';
import { Label } from './Label';

interface RefreshButtonProps {
  onClick: () => void;
  icon: (props: IconProps) => JSX.Element;
  label: string;
}

export const TopNavBarButton = ({ onClick, icon: Icon, label }: RefreshButtonProps) => {
  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick}>
      <Icon />
      <Label textSize="xs" className="pt-1">
        {label}
      </Label>
    </div>
  );
};
