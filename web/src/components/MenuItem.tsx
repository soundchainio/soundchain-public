import { IconProps } from 'icons/types/IconProps'

interface SideMenuMobileProps {
  icon: (props: IconProps) => JSX.Element
  label: string
  onClick: () => void
}

export const MenuItem = ({ icon: Icon, label, onClick }: SideMenuMobileProps) => {
  return (
    <button
      className="flex h-12 w-full flex-shrink-0 items-center space-x-2 border-t-2 border-gray-30 bg-gray-25 px-4 py-2 last:border-b-2"
      onClick={onClick}
    >
      <Icon />
      <div className="font-bold text-gray-CC">{label}</div>
    </button>
  )
}
