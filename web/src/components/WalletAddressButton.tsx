import { Button } from 'components/OldButtons/Button'
import { useMe } from 'hooks/useMe'
import Clip from '../icons/Clip'
import { toast } from 'react-toastify'

interface WalletAddressButtonProps {
  address: string | null
}

export const WalletAddressButton = ({ address }: WalletAddressButtonProps) => {
  const me = useMe()

  if (!me || !address) {
    return null
  }

  const handleClick = () => {
    navigator.clipboard.writeText(address + '')
    toast('Copied address to clipboard')
  }

  return (
    <div className="h-8">
      <Button
        variant="outline-rounded"
        icon={Clip}
        className="py-1 pl-1 pr-3"
        borderColor="bg-gray-50"
        textColor="text-gray-50 font-normal"
        aria-label={'Copy SoundChain wallet address to clipboard'}
        onClick={handleClick}
        title={address}
      >
        {address.slice(0, 5)}...{address.slice(address.length - 3)}
      </Button>
    </div>
  )
}
