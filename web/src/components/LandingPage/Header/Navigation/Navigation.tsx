import { Popover } from '@headlessui/react'
import { MarketplaceButton, Whitepaper, AirdropButton, OgunButton, RoadmapButton } from './components'

export const Navigation = () => {
  return (
    <Popover as="nav" className="hidden md:block">
      <div className="flex items-center">
        <MarketplaceButton />
        <AirdropButton />
        <OgunButton />
        <RoadmapButton />
        <Whitepaper />
      </div>
    </Popover>
  )
}
