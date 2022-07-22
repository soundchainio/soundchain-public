import { useTokenOwner } from 'hooks/useTokenOwner';
import { Button } from './Button';
import { NftOwner } from './details-NFT/NftOwner';
import { Matic } from './Matic';

interface BuyNowEditionListItemProps {
  trackId: string;
  price: number;
  owner: string;
  tokenId: number;
  isProcessing: boolean;
  contractAddress: string;
}

export const BuyNowEditionListItem = ({
  trackId,
  price,
  owner,
  tokenId,
  isProcessing,
  contractAddress,
}: BuyNowEditionListItemProps) => {
  return (
    <li key={trackId} className="flex items-center p-2 odd:bg-gray-17 even:bg-gray-15">
      <Matic value={price} className="min-w-[140px] text-xs" />
      <NftOwner owner={owner} className="flex-1" />
      <Action trackId={trackId} tokenId={tokenId} contractAddress={contractAddress} isProcessing={isProcessing} />
    </li>
  );
};

interface ActionProps {
  tokenId: number;
  trackId: string;
  isProcessing: boolean;
  contractAddress: string;
}

function Action(props: ActionProps) {
  const { isProcessing, tokenId, trackId, contractAddress } = props;

  const { loading, isOwner } = useTokenOwner(tokenId, contractAddress);

  if (loading || isProcessing) {
    return (
      <div className='flex justify-center items-center px-6'>
        <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
      </div>
    )
  }

  if (isOwner) {
    return (
      <Button
        as="a"
        href={`/tracks/${trackId}/edit/buy-now`}
        variant="edit-listing"
        className="h-7"
      >
        EDIT
      </Button>
    )
  }

  return (
    <Button
      as="a"
      href={`/tracks/${trackId}/buy-now`}
      variant="outline"
      borderColor="bg-green-gradient"
      className="h-7 w-12"
      bgColor="bg-gray-10 rounded-none"
    >
      BUY
    </Button>
  )
}
