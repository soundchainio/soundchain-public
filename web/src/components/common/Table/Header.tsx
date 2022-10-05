import tw from 'tailwind-styled-components'

interface HeaderProps {
  children: React.ReactNode
  $bgDark?: boolean
  $roundedTopRight?: boolean
  $roundedTopLeft?: boolean
}

export const Header = (props: HeaderProps) => {
  const { children, ...rest } = props

  return <HeaderContainer {...rest}>{children}</HeaderContainer>
}

const HeaderContainer = tw.th<HeaderProps>`
  ${({ $roundedTopRight }) => $roundedTopRight && 'rounded-tr-lg'}
  ${({ $roundedTopLeft }) => $roundedTopLeft && 'rounded-tl-lg'}

  bg-[#101010] 
  text-white
  border-collapse
  py-2
`
