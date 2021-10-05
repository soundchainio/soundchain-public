
interface HandleNFTProps {
  isOwner: boolean;
}

import { Button } from "components/Button"
import { Checkmark } from "icons/Checkmark"

export const HandleNFT = ({ isOwner }: HandleNFTProps) => {
  return (
    <div className="w-full bg-black text-white flex items-center">
      {isOwner ?
        <div>
          <Checkmark className="mr-2" />
          You own this NFT
          <Button variant="clear">
            <div className="px-4">SELL NFT </div>
          </Button>
        </div>
        :
        <div>
          <Button variant="clear">
            <div className="px-4">BUY NFT </div>
          </Button>
        </div>
      }
    </div>
  )
}