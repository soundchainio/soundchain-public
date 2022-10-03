import tw from 'tailwind-styled-components'

interface TableProps {
  children: React.ReactNode
}

export const Table = (props: TableProps) => {
  const { children } = props

  return <TableContainer>{children}</TableContainer>
}

const TableContainer = tw.table`
  text-white
  mt-6
  w-full
  border-collapse
`
