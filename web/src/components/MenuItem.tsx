import { IconProps } from 'icons/types/IconProps';

interface SideMenuMobileProps {
  icon: (props: IconProps) => JSX.Element;
  label: string;
  onClick: () => void;
}

export const MenuItem = ({ icon: Icon, label, onClick }: SideMenuMobileProps) => {
  return (
    <div
      className="flex-shrink-0 flex bg-gray-25 p-4 border-t-2 last:border-b-2 border-gray-30 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center ">
        <div className="flex flex-row space-x-2 items-center h-10 ">
          <Icon />
          <div className="text-gray-CC font-bold">{label}</div>
        </div>
      </div>
    </div>
  );
};
