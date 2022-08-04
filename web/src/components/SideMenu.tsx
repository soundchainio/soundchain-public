import { config } from 'config';
import { SideMenuContent } from './SideMenuContent';
import { SideMenuMobile, SideMenuMobileProps } from './SideMenuMobile';

export const SideMenu = ({ isOpen, setOpen }: SideMenuMobileProps) => {
  return (
    <>
      <SideMenuMobile isOpen={isOpen} setOpen={setOpen} />
      <div className={`hidden bg-gray-20 ${config.mobileBreakpoint}:flex ${config.mobileBreakpoint}:flex-shrink-0`}>
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4"></div>
            <SideMenuContent />
          </div>
        </div>
      </div>
    </>
  );
};
export default SideMenu;
