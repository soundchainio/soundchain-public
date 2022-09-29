import tw from 'tailwind-styled-components'

export const Divider = () => {
  return <StyledDivider />
}

const StyledDivider = tw.div`
  h-[2px] 
  w-full 
  bg-[#323333]
`
