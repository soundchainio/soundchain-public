import tw from 'tailwind-styled-components'

interface Props {
  classnames?: string
}

export const Divider = (props: Props) => {
  const { classnames } = props
  return <StyledDivider className={classnames} />
}

const StyledDivider = tw.div`
  h-[2px] 
  w-full 
  bg-neutral-700
`
