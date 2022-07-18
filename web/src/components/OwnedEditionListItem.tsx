import { ListingItemViewComponentFieldsFragment } from 'lib/graphql';
import NextLink from 'next/link';
import { Button } from './Button';
import { AuthorActionsType } from '../types/AuthorActionsType';
import { Ellipsis } from '../icons/Ellipsis';
import { useModalDispatch } from '../contexts/providers/modal';

interface OwnedEditionListItemProps {
  canList: boolean;
  isProcessing: boolean;
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string;
  tokenId: number;
}

export const OwnedEditionListItem = ({
  canList,
  isProcessing,
  listingItem,
  trackId,
  tokenId,
}: OwnedEditionListItemProps) => {
  return (
    <li key={trackId} className="flex items-center justify-between p-2 pl-4 odd:bg-gray-17 even:bg-gray-15">
      <p className='font-bold text-xs'>#{tokenId}</p>
      <Action isProcessing={isProcessing} listingItem={listingItem} trackId={trackId} canList={canList} />
    </li>
  );
};

interface ActionProps {
  canList: boolean;
  isProcessing: boolean;
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string;
}

function Action(props: ActionProps) {
  const { canList, isProcessing, listingItem, trackId } = props;
  const {dispatchShowAuthorActionsModal} = useModalDispatch()

  if (canList) {
    if (isProcessing) {
      return (
        <div className='flex justify-center items-center px-6'>
          <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
        </div>
      )
    }
  
    if (!listingItem) {
      return (
        <div className="flex justify-center items-center px-6">
          <NextLink href={`/tracks/${trackId}/list/buy-now`}>
            <Button
              variant="list-nft"
              className="h-7"
            >
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

  return null;
}