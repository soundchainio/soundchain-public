import tw from 'tailwind-styled-components'

interface RowProps {
  children: React.ReactNode
}

export const Row = (props: RowProps) => {
  const { children } = props

  return <RowContainer>{children}</RowContainer>
}

const RowContainer = tw.tr`
  w-full
  text-sm
  border-b-[1px]
  border-black
`
