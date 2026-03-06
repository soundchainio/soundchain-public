import { IconProps } from './types/IconProps'

export const CircleRightArrow = (props: IconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="#505050"
        d="M20 10a10 10 0 10-20 0 10 10 0 0020 0zM1.25 10a8.75 8.75 0 1117.5 0 8.75 8.75 0 01-17.5 0z"
      ></path>
      <path
        fill="#505050"
        d="M16.087 10.05l-4.756-4.756a.625.625 0 10-.881.88l3.187 3.2H4.262a.625.625 0 100 1.25h9.488l-3.3 3.3a.626.626 0 10.881.882l4.756-4.756z"
      ></path>
    </svg>
  )
}
