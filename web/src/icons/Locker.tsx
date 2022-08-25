import { IconProps } from './types/IconProps'

export const Locker = (props: IconProps) => {
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3.599 0c-.997-.005-1.871.593-2.294 1.526-.217.518-.204 1.228-.194 1.848H0V8h7.303V3.374H6.095v-.878c0-.344-.071-.661-.203-.97C5.505.64 4.595.005 3.599 0zm0 1.473A1.041 1.041 0 014.63 2.487v.887H2.575v-.878c.055-.61.442-1.038 1.024-1.023z"
        fill={props.fill || 'gray'}
      />
    </svg>
  )
}
