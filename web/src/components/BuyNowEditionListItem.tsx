import useBlockchain from 'hooks/useBlockchain';
import { useWalletContext } from 'hooks/useWalletContext';
import { useEffect, useState } from 'react';
import { Button } from './Button';
import { NftOwner } from './details-NFT/NftOwner';
import { Matic } from './Matic';

interface BuyNowEditionListItemProps {
  trackId: string;
  price: number;
  owner: string;
  tokenId: number;
  contractAddress: string;
}

export const BuyNowEditionListItem = ({
  trackId,
  price,
  owner,
  tokenId,
  contractAddress,
}: BuyNowEditionListItemProps) => {
  const { isTokenOwner } = useBlockchain();
  const { account, web3 } = useWalletContext();

  const [isLoadingOwner, setLoadingOwner] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    if (!account || !web3 || tokenId === null || tokenId === undefined) {
      console.log({ tokenId, contractAddress, account, web3 });

      return;
    }
    isTokenOwner(web3, tokenId, account, { nft: contractAddress })
      .then(result => setIsOwner(result))
      .finally(() => setLoadingOwner(false));
  }, [account, web3, tokenId, isTokenOwner, contractAddress]);

  return (
    <li key={trackId} className="flex items-center p-2 odd:bg-gray-17 even:bg-gray-15">
      <Matic value={price} className="min-w-[140px] text-xs" />
      <NftOwner owner={owner} className="flex-1" />
      {!isOwner && (
        <Button
          as="a"
          href={`/tracks/${trackId}/buy-now`}
          variant="outline"
          borderColor="bg-green-gradient"
          className="h-7 w-12"
          loading={isLoadingOwner}
        >
          BUY
        </Button>
      )}
    </li>
  );
};
