import { useEffect, useState } from "react";
import useBlockchain from "./useBlockchain";
import { useWalletContext } from "./useWalletContext";

export function useTokenOwner(tokenId?: number | null, nftContractAddress?: string | null) {
  const { account, web3 } = useWalletContext();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const { isTokenOwner } = useBlockchain();

  useEffect(() => {
    setIsOwner(false);
    if (!account || !web3 || tokenId === null || tokenId === undefined) {
      setLoading(false);
      return;
    }
    isTokenOwner(web3, tokenId, account, { nft: nftContractAddress })
      .then(result => setIsOwner(result))
      .finally(() => setLoading(false));
  }, [account, web3, tokenId, isTokenOwner, nftContractAddress]);

  return {
    loading,
    isOwner
  }
}