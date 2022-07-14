import { ListingItemViewComponentFieldsFragment } from 'lib/graphql';
import NextLink from 'next/link';
import { Button } from './Button';

interface OwnedEditionListItemProps {
  isProcessing: boolean;
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string;
  tokenId: number;
}

export const OwnedEditionListItem = ({
  isProcessing,
  listingItem,
  trackId,
  tokenId,
}: OwnedEditionListItemProps) => {
  return (
    <li key={trackId} className="flex items-center justify-between p-2 pl-4 odd:bg-gray-17 even:bg-gray-15">
      <p className='font-bold text-xs'>#{tokenId}</p>
      <Action isProcessing={isProcessing} listingItem={listingItem} trackId={trackId} />
    </li>
  );
};

interface ActionProps {
  isProcessing: boolean;
  listingItem?: ListingItemViewComponentFieldsFragment | null
  trackId: string;
}

function Action(props: ActionProps) {
  const { isProcessing, listingItem, trackId } = props;

  if (isProcessing) {
    return (
      <div className='flex justify-center items-center px-6'>
        <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-white'></div>
      </div>
    )
  }

  if (!listingItem) {
    return (
      <NextLink href={`/tracks/${trackId}/list/buy-now`}>
        <Button
          variant="list-nft"
          className="h-7"
        >
          LIST
        </Button>
      </NextLink>
    )
  }

  return null;
}