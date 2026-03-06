import { Copy2 as Copy } from 'icons/Copy2'
import { Polygon } from 'icons/Polygon'
import { toast } from 'react-toastify'

interface CopyWalletAddressProps {
  walletAddress: string
}

export const CopyWalletAddress = ({ walletAddress }: CopyWalletAddressProps) => {
  return (
    <div className="flex w-full flex-row items-center justify-between rounded-sm border border-gray-50 bg-gray-1A py-2 pl-2 pr-3 text-xxs">
      <div className="flex w-10/12 flex-row items-center justify-start">
        <Polygon />
        <span className="md-text-sm mx-1 w-full truncate font-bold text-gray-80">{walletAddress}</span>
      </div>
      <button
        className="flex flex-row items-center gap-1 rounded border-2 border-gray-30 border-opacity-75 p-1"
        onClick={() => {
          navigator.clipboard.writeText(walletAddress + '')
          toast('Copied to clipboard')
        }}
        type="button"
      >
        <Copy />
        <span className="uppercase leading-none text-gray-80">copy</span>
      </button>
    </div>
  )
}
