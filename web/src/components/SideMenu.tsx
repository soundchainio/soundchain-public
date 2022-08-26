import { SideMenuMobile, SideMenuMobileProps } from './SideMenuMobile'

export const SideMenu = ({ isOpen, setOpen }: SideMenuMobileProps) => {
  return (
    <>
      <SideMenuMobile isOpen={isOpen} setOpen={setOpen} />
    </>
  )
}
export default SideMenu
