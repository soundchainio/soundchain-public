import { Button } from 'components/Button';
import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'icons/Matic';
import { useRouter } from 'next/router';

interface HandleNFTProps {
  isOwner: boolean;
  isForSale: boolean;
  price: string;
}

export const HandleNFT = ({ isOwner, isForSale, price }: HandleNFTProps) => {
  const router = useRouter();
  const me = useMe();

  const isApproved = me?.isApprovedOnMarketplace;
  const { dispatchShowApproveModal } = useModalDispatch();

  const handleListButton = () => {
    if (isApproved) {
      return router.push(`${router.asPath}/list`);
    }
    me ? dispatchShowApproveModal(true) : router.push('/login');
  };

  if (isOwner && isForSale) {
    return (
      <div className="w-full bg-black text-white flex justify-center p-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <CheckmarkFilled />
          {`You've listed this NFT`}
        </div>
      </div>
    );
  } else if (isOwner) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex items-center flex-1 gap-2 text-sm font-bold pl-4">
          <CheckmarkFilled />
          You own this NFT
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Button variant="list-nft" onClick={handleListButton}>
            <div className="px-4 font-bold">LIST NFT </div>
          </Button>
        </div>
      </div>
    );
  } else if (isForSale) {
    return (
      <div className="w-full bg-black text-white flex items-center py-3">
        <div className="flex flex-col flex-1 ml-4">
          <div className="text-md flex items-center font-bold gap-1">
            <Matic />
            <span>{price}</span>
            <span className="text-xs text-gray-80">MATIC</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Button variant="buy-nft" onClick={() => router.push(`${router.asPath}/buy`)}>
            BUY NFT
          </Button>
        </div>
      </div>
    );
  }
  return null;
};
