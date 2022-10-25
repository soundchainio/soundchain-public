import tw from 'tailwind-styled-components'

interface CellProps {
  children: React.ReactNode
  $bgDark?: boolean
  $roundedTopRight?: boolean
  $roundedTopLeft?: boolean
  $roundedBottomRight?: boolean
  $roundedBottomLeft?: boolean
}

export const Cell = (props: CellProps) => {
  const { children, ...rest } = props

  return <TableCellContainer {...rest}>{children}</TableCellContainer>
}

const TableCellContainer = tw.td<CellProps>`
  ${({ $bgDark }) => ($bgDark ? 'bg-[#101010]' : 'bg-[#202020]')}

  ${({ $roundedTopRight }) => $roundedTopRight && 'rounded-tr-lg'}
  ${({ $roundedTopLeft }) => $roundedTopLeft && 'rounded-tl-lg'}
  ${({ $roundedBottomRight }) => $roundedBottomRight && 'rounded-br-lg'}
  ${({ $roundedBottomLeft }) => $roundedBottomLeft && 'rounded-bl-lg'}

  p-4
  overflow-auto
  text-center
`
