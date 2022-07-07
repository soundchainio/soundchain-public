import { BackButton } from 'components/Buttons/BackButton';
import { BuyNowEditionListItem } from 'components/BuyNowEditionListItem';
import { Description } from 'components/details-NFT/Description';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { NoResultFound } from 'components/NoResultFound';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { TrackShareButton } from 'components/TrackShareButton';
import useBlockchain from 'hooks/useBlockchain';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { PriceTag } from 'icons/PriceTag';
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting';
import { TrackQuery, useBuyNowListingItemsQuery, useProfileLazyQuery } from 'lib/graphql';
import { useEffect, useMemo, useState } from 'react';

interface MultipleTrackPageProps {
  track: TrackQuery['track'];
}

export const MultipleTrackPage = ({ track }: MultipleTrackPageProps) => {
  const me = useMe();
  const { account, web3 } = useWalletContext();
  const [profile, { data: profileInfo }] = useProfileLazyQuery();

  const { setTopNavBarProps } = useLayoutContext();
  const [royalties, setRoyalties] = useState<number>();
  const { getRoyalties } = useBlockchain();

  const { data, fetchMore, loading } = useBuyNowListingItemsQuery({
    variables: {
      page: { first: 10 },
      sort: SelectToApolloQuery[SortListingItem.CreatedAt],
      filter: { trackEdition: track.trackEditionId || '' },
    },
    ssr: false,
  });

  const title = `${track.title} - song by ${track.artist} | SoundChain`;
  const description = `Listen to ${track.title} on SoundChain. ${track.artist}. ${track.album || 'Song'}. ${
    track.releaseYear != null ? `${track.releaseYear}.` : ''
  }`;
  const nftData = track.nftData;
  const tokenId = nftData?.tokenId;

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      leftButton: <BackButton />,
      title: 'NFT Details',
      rightButton: (
        <div className="flex items-center gap-3">
          <TrackShareButton trackId={track.id} artist={track.artist} title={track.title} />
        </div>
      ),
    }),
    [track.artist, track.id, track.title],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || tokenId === null || tokenId === undefined || royalties != undefined) {
        return;
      }
      const royaltiesFromBlockchain = await getRoyalties(web3, tokenId, { nft: nftData?.contract });
      setRoyalties(royaltiesFromBlockchain);
    };
    fetchRoyalties();
  }, [account, web3, tokenId, getRoyalties, royalties, nftData?.contract]);

  useEffect(() => {
    if (track.artistProfileId) {
      profile({ variables: { id: track.artistProfileId } });
    }
  }, [track.artistProfileId, profile]);

  if (!data?.buyNowListingItems.nodes.length) {
    return <NoResultFound type="tracks" />;
  }

  const { nodes, pageInfo } = data.buyNowListingItems;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: 10,
          after: pageInfo.endCursor,
        },
      },
    });
  };

  return (
    <>
      <SEO title={title} description={description} canonicalUrl={`/tracks/${track.id}`} image={track.artworkUrl} />
      <div className="flex flex-col gap-5 p-3">
        <Track track={track} />
        <Description description={track.description || ''} className="p-4" />
        <TrackInfo
          trackTitle={track.title}
          albumTitle={track.album}
          releaseYear={track.releaseYear}
          genres={track.genres}
          copyright={track.copyright}
          artistProfile={profileInfo?.profile}
          royalties={royalties}
          me={me}
        />
        <div>{nftData && <MintingData transactionHash={nftData.transactionHash} ipfsCid={nftData.ipfsCid} />}</div>
        <section className="">
          <h3 className="flex items-center gap-2 px-2 py-4 font-bold text-gray-80">
            <PriceTag fill="#808080" />
            <p>Listings</p>
          </h3>
          {!loading && (
            <>
              <div className="flex h-8 items-center bg-gray-20 p-2 text-xs font-black text-white">
                <p className="min-w-[140px]">Price</p>
                <p>From</p>
              </div>
              <ol className="text-white">
                {nodes.map(item => (
                  <BuyNowEditionListItem
                    key={item.id}
                    price={item.listingItem?.pricePerItemToShow || 0}
                    owner={item.nftData?.owner || ''}
                    trackId={item.id}
                    tokenId={item.nftData?.tokenId || 0}
                    contractAddress={item.nftData?.contract || ''}
                  />
                ))}
                {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
              </ol>
            </>
          )}
        </section>
      </div>
    </>
  );
};
