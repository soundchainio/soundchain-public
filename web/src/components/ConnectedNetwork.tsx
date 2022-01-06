import { Polygon } from 'icons/Polygon';
import { network } from 'lib/blockchainNetworks';

export const ConnectedNetwork = () => {
  return (
    <div className="flex gap-2 items-center font-bold text-xs">
      <span className="ml-auto uppercase relative text-gray-80 before:bg-green-400 before:rounded-full before:h-1 before:w-1 before:inline-block before:absolute before:mt-[0.375rem] before:-ml-2">
        Network:
      </span>
      <Polygon />
      <span className="text-white mr-2">{network.name}</span>
    </div>
  );
};
