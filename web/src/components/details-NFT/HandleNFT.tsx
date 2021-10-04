
// interface HandleNFTProps {
//   trackTitle: string;
//   albumTitle: string;
//   releaseYear: number;
// }

import { Button } from "components/Button"
import { Checkmark } from "icons/Checkmark"

export const HandleNFT = () => {
  return (
    <div className="w-full bg-black text-white flex items-center">
      <Checkmark className="mr-2" />
      You own this NFT
      <Button variant="clear">
        <div className="px-4">SELL NFT </div>
      </Button>
    </div>
  )
}