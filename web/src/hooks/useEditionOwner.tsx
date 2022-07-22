import { useEffect, useState } from "react";
import useBlockchain from "./useBlockchain";
import { useWalletContext } from "./useWalletContext";

export function useEditionOwner(editionNumber?: number | null, nftContractAddress?: string | null) {
  const { account, web3 } = useWalletContext();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const { isEditionOwner } = useBlockchain();

  useEffect(() => {
    setIsOwner(false);
    if (!account || !web3 || editionNumber === null || editionNumber === undefined) {
      setLoading(false);
      return;
    }
    isEditionOwner(web3, editionNumber, account, { nft: nftContractAddress })
      .then(result => setIsOwner(result))
      .finally(() => setLoading(false));
  }, [account, web3, editionNumber, isEditionOwner, nftContractAddress]);

  return {
    loading,
    isOwner
  }
}