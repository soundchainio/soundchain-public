import { Polygon } from 'icons/Polygon'
import { network } from 'lib/blockchainNetworks'

export const ConnectedNetwork = () => {
  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <span className="relative ml-auto uppercase text-gray-80 before:absolute before:mt-[0.375rem] before:-ml-2 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-green-400">
        Network:
      </span>
      <Polygon />
      <span className="mr-2 text-white">{network.name}</span>
    </div>
  )
}
