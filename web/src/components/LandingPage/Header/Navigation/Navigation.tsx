import { Popover } from '@headlessui/react'
import { Tokenomics } from './components/Tokenomics'

export const Navigation = () => {
  return (
    <Popover as="nav" className="hidden md:block">
      <Tokenomics />
    </Popover>
  )
}
