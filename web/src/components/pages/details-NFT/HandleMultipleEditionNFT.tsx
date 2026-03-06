import { useModalDispatch } from 'contexts/ModalContext'
import { ContractAddresses } from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { CheckmarkFilled } from 'icons/CheckmarkFilled'
import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { SaleType } from 'lib/graphql'
import { ListedAction, ListingAction } from './HandleNFT'

interface HandleMultipleEditionNFTProps {
  canList: boolean
  contractAddresses?: ContractAddresses
  editionId?: number
  endingDate?: Date
  isBuyNow: boolean
  isMinter: boolean
  isEditionListed?: boolean
  price: number
  OGUNprice: number
  startingDate?: Date
  trackEditionId?: string
  isPaymentOGUN?: boolean
}

export const HandleMultipleEditionNFT = ({
  canList,
  contractAddresses,
  endingDate,
  editionId,
  isEditionListed,
  isMinter,
  price,
  OGUNprice,
  startingDate,
  trackEditionId,
  isPaymentOGUN,
}: HandleMultipleEditionNFTProps) => {
  const router = useRouter()
  const { account, web3 } = useWalletContext()
  const { dispatchShowRemoveListingModal } = useModalDispatch()

  const handleRemove = useCallback(() => {
    if (!web3 || !editionId || !account) {
      return
    }
    dispatchShowRemoveListingModal({
      show: true,
      editionId,
      saleType: SaleType.BuyNow,
      contractAddresses,
      trackEditionId,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, editionId, web3])

  if (isMinter) {
    if (!canList) {
      return (
        <ListingAction href={`/get-verified`} action="GET VERIFIED">
          You must be verified in order to sell NFT’s.
        </ListingAction>
      )
    }
    if (isEditionListed) {
      return (
        <ListedAction
          onClick={handleRemove}
          price={price}
          OGUNprice={OGUNprice}
          isPaymentOGUN={isPaymentOGUN}
          startingDate={startingDate}
          endingDate={endingDate}
          action="REMOVE EDITION LISTING"
          variant="cancel"
        />
      )
    }
    return (
      <ListingAction href={`${router.asPath}/list/buy-now-edition`} action="LIST EDITION">
        <CheckmarkFilled />
        You own this NFT
      </ListingAction>
    )
    // not the owner
  }
  return null
}
