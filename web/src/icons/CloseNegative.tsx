import { IconProps } from './types/IconProps'

export const CloseNegative = ({...props }: IconProps) => {
  return (
    <svg width={22} height={22} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M15.34 8.322a.998.998 0 00-.267-1.642 1 1 0 00-1.097.179L11.05 9.587 8.322 6.66A1 1 0 006.86 8.024l2.728 2.926-2.927 2.728a1 1 0 101.364 1.462l2.926-2.727 2.728 2.926a1 1 0 101.462-1.363l-2.727-2.926 2.926-2.728z"
        fill="#303030"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 11C0 4.925 4.925 0 11 0s11 4.925 11 11-4.925 11-11 11S0 17.075 0 11zm11 9a9 9 0 110-18 9 9 0 010 18z"
        fill="#303030"
      />
    </svg>
  )
}
