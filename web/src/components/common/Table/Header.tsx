import tw from 'tailwind-styled-components'

interface HeaderProps {
  $bgDark?: boolean
  $roundedTopRight?: boolean
  $roundedTopLeft?: boolean
}

export const Header = tw.th<HeaderProps>`
  ${({ $roundedTopRight }) => $roundedTopRight && 'rounded-tr-lg'}
  ${({ $roundedTopLeft }) => $roundedTopLeft && 'rounded-tl-lg'}

  bg-[#101010] 
  text-white
  border-collapse
  py-2
`
