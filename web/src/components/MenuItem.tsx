import { IconProps } from 'icons/types/IconProps';

interface SideMenuMobileProps {
  icon: (props: IconProps) => JSX.Element;
  label: string;
  onClick: () => void;
}

export const MenuItem = ({ icon: Icon, label, onClick }: SideMenuMobileProps) => {
  return (
    <button
      className="flex-shrink-0 flex bg-gray-25 p-4 border-t-2 last:border-b-2 border-gray-30 items-center space-x-2 h-16 w-full"
      onClick={onClick}
    >
      <Icon />
      <div className="text-gray-CC font-bold">{label}</div>
    </button>
  );
};
