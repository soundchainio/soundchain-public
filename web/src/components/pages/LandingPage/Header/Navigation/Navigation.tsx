import { Popover } from '@headlessui/react'
import { AirdropButton, MarketplaceButton, OgunButton, RoadmapButton, Whitepaper } from './components'

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
