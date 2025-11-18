import { ListingItemViewComponentFieldsFragment } from 'lib/graphql'
import NextLink from 'next/link'
import { Button } from './common/Buttons/Button'
import { AuthorActionsType } from '../types/AuthorActionsType'
import { Ellipsis } from '../icons/Ellipsis'
import { useModalDispatch } from '../contexts/ModalContext'
import { useTokenOwner } from 'hooks/useTokenOwner'

interface OwnedEditionListItemProps {
  canList: boolean
  isProcessing: boolean
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string
  tokenId: number
  contractAddress: string
}

export const OwnedEditionListItem = ({
  canList,
  isProcessing,
  listingItem,
  trackId,
  tokenId,
  contractAddress,
}: OwnedEditionListItemProps) => {
  return (
    <li key={trackId} className="flex items-center justify-between p-2 pl-4 odd:bg-gray-17 even:bg-gray-15">
      <p className="text-xs font-bold">#{tokenId}</p>
      <Action
        isProcessing={isProcessing}
        listingItem={listingItem}
        trackId={trackId}
        tokenId={tokenId}
        canList={canList}
        contractAddress={contractAddress}
      />
    </li>
  )
}

interface ActionProps {
  canList: boolean
  isProcessing: boolean
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string
  tokenId: number
  contractAddress: string
}

function Action(props: ActionProps) {
  const { canList, isProcessing, listingItem, trackId, tokenId, contractAddress } = props
  const { dispatchShowAuthorActionsModal } = useModalDispatch()
  const { isOwner } = useTokenOwner(tokenId, contractAddress)

  if (canList) {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center px-6">
          <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
        </div>
      )
    }

    if (!listingItem && isOwner) {
      return (
        <div className="flex items-center justify-center px-6">
          <NextLink href={`/tracks/${trackId}/list/buy-now`}>
            <Button variant="list-nft" className="h-7">
              LIST
            </Button>
          </NextLink>
          <button
            type="button"
            aria-label="More options"
            className="flex h-10 w-10 items-center justify-center"
            onClick={() => dispatchShowAuthorActionsModal(true, AuthorActionsType.NFT, trackId, true)}
          >
            <Ellipsis fill="#808080" />
          </button>
        </div>
      )
    }
  }

  return null
}
