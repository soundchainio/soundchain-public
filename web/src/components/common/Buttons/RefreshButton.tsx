import { Refresh } from 'icons/Refresh'

interface RefreshButtonProps {
  onClick: () => void
  label?: string
  className?: string
  refreshing?: boolean
}

export const RefreshButton = ({ onClick, className, refreshing }: RefreshButtonProps) => {
  return (
    <button className={`${className} flex flex-col items-center`} onClick={onClick}>
      <span className={refreshing ? 'animate-spin' : ''}>
        <Refresh />
      </span>
    </button>
  )
}
