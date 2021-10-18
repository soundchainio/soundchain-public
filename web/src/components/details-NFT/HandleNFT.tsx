import { Button } from 'components/Button';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Checkmark } from 'icons/Checkmark';
import { Matic } from 'icons/Matic';
import { useRouter } from 'next/router';

interface HandleNFTProps {
  isOwner: boolean;
  isForSale: boolean;
}

export const HandleNFT = ({ isOwner, isForSale }: HandleNFTProps) => {
  const router = useRouter();
  const me = useMe();

  const isApproved = me?.isApprovedOnMarketplace;
  const { dispatchShowApproveModal } = useModalDispatch();

  const handleSellButton = () => {
    if (isApproved) {
      return router.push(`${router.asPath}/sell`);
    }
    me ? dispatchShowApproveModal(true) : router.push('/login');
  };

  if (isOwner) {
    return (
      <div className="w-full bg-black text-white flex items-center py-2">
        <div className="w-full flex items-center">
          <div className="flex items-center flex-1 text-sm justify-center">
            <Checkmark className="mr-2" />
            You own this NFT
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Button variant="sell-nft" onClick={handleSellButton}>
              <div className="px-4">SELL NFT </div>
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (isForSale) {
    return (
      <div className="w-full bg-black text-white flex items-center py-2">
        <div className="w-full bg-black text-white flex items-center py-2">
          <div className="flex items-center w-full flex-1">
            <div className="flex flex-col flex-1 ml-4">
              <div className="text-md flex items-end font-bold">
                <Matic className="mr-2 mb-1" />
                <span className="self-end"> 34.547 </span>
                <span className="ml-1 self-end text-xs text-gray-80">MATIC</span>
              </div>
              <div className="text-xs text-gray-80 mt-1 font-bold">$38.37 USD</div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Button variant="buy-nft" onClick={() => router.push(`${router.asPath}/buy`)}>
                BUY NFT
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <div></div>;
};
