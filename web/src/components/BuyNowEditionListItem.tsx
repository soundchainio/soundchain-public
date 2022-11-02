import { useTokenOwner } from 'hooks/useTokenOwner'
import { useWalletContext } from 'hooks/useWalletContext'
import { Button } from './common/Buttons/Button'
import { NftOwner } from './details-NFT/NftOwner'
import { Matic } from './Matic'
import { Ogun } from './Ogun'
import OutlinedLink from './Links/OutlinedLink'

interface BuyNowEditionListItemProps {
  trackId: string
  price: number
  priceOGUN: number
  isPaymentOGUN: boolean
  profileId: string
  tokenId: number
  isProcessing: boolean
  contractAddress: string
}

export const BuyNowEditionListItem = ({
  trackId,
  price,
  priceOGUN,
  isPaymentOGUN,
  profileId,
  tokenId,
  isProcessing,
  contractAddress,
}: BuyNowEditionListItemProps) => {
  return (
    <li key={trackId} className="flex items-center p-2 odd:bg-gray-17 even:bg-gray-15">
      <span className="px-2 text-xs font-bold">#{tokenId}</span>
      {!isPaymentOGUN && <Matic value={price} className="min-w-[140px] text-xs" variant="listing-inline" />}
      {isPaymentOGUN && <Ogun value={priceOGUN} className="min-w-[140px] text-xs" />}
      <NftOwner profileId={profileId} className="flex-1" />
      <Action
        trackId={trackId}
        isPaymentOGUN={isPaymentOGUN}
        tokenId={tokenId}
        contractAddress={contractAddress}
        isProcessing={isProcessing}
      />
    </li>
  )
}

interface ActionProps {
  tokenId: number
  trackId: string
  isPaymentOGUN: boolean
  isProcessing: boolean
  contractAddress: string
}

function Action(props: ActionProps) {
  const { isPaymentOGUN, isProcessing, tokenId, trackId, contractAddress } = props

  const { loading, isOwner } = useTokenOwner(tokenId, contractAddress)
  const { account } = useWalletContext()

  if (loading || isProcessing) {
    return (
      <div className="flex items-center justify-center px-6">
        <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
      </div>
    )
  }

  if (isOwner) {
    return (
      <Button href={`/tracks/${trackId}/edit/buy-now`} variant="edit-listing" className="h-7">
        EDIT
      </Button>
    )
  }

  if (account) {
    return (
      <OutlinedLink
        href={`/tracks/${trackId}/buy-now${isPaymentOGUN ? '?isPaymentOGUN=true' : ''}`}
        borderColor="bg-green-gradient"
        className="h-7 w-12"
        bgColor="bg-gray-10 rounded-none"
      >
        BUY
      </OutlinedLink>
    )
  }

  return null
}
