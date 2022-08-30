import { ClientOnlyPortal } from 'components/ClientOnlyPortal'
import { ReactChild } from 'react'

interface TopSheetProps {
  children: ReactChild | ReactChild[]
}

export const TopSheet = ({ children }: TopSheetProps) => {
  return <ClientOnlyPortal selector="#top-sheet">{children}</ClientOnlyPortal>
}
