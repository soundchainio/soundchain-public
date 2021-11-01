import { BackButton } from 'components/Buttons/BackButton';
import { Description } from 'components/details-NFT/Description';
import { HandleNFT } from 'components/details-NFT/HandleNFT';
import { MintingData } from 'components/details-NFT/MintingData';
import { TrackInfo } from 'components/details-NFT/TrackInfo';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useWalletContext } from 'hooks/useWalletContext';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  Profile,
  TrackDocument,
  useListingItemQuery,
  useProfileLazyQuery,
  useTrackQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';

export interface TrackPageProps {
  trackId: string;
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const { error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(TrackPage, { trackId }, context, apolloClient);
});

const pendingRequestMapping: Record<PendingRequest, string> = {
  CancelListing: 'cancel listing',
  Buy: 'buy',
  List: 'list',
  Mint: 'mint',
  None: 'none',
  UpdateListing: 'update listing',
};

export default function TrackPage({ trackId }: TrackPageProps) {
  const { account, web3 } = useWalletContext();
  const { data, refetch: refetchTrack } = useTrackQuery({ variables: { id: trackId }, fetchPolicy: 'network-only' });
  const { isTokenOwner, getRoyalties } = useBlockchain();
  const [isOwner, setIsOwner] = useState<boolean>();
  const [royalties, setRoyalties] = useState(0);

  const mintingPending = data?.track.nftData?.pendingRequest === PendingRequest.Mint;
  const isProcessing = data?.track.nftData?.pendingRequest != PendingRequest.None;

  const tokenId = data?.track.nftData?.tokenId || -1;

  const {
    data: listingPayload,
    loading,
    refetch: refetchListing,
  } = useListingItemQuery({
    variables: { tokenId },
    fetchPolicy: 'network-only',
  });

  const [profile, { data: profileInfo }] = useProfileLazyQuery({
    variables: { id: data?.track.artistProfileId ?? '' },
    ssr: false,
  });

  const [userByWallet, { data: ownerProfile }] = useUserByWalletLazyQuery({
    variables: { walletAddress: data?.track.nftData?.owner ?? '' },
    ssr: false,
  });

  useEffect(() => {
    if (data?.track.artistProfileId) {
      profile();
    }
  }, [data?.track.artistProfileId, profile]);

  useEffect(() => {
    if (data?.track.nftData?.owner) {
      userByWallet();
    }
  }, [data?.track.nftData?.owner, userByWallet]);

  useEffect(() => {
    const fetchIsOwner = async () => {
      if (!account || !web3 || !data?.track.nftData?.tokenId) {
        return;
      }
      const isTokenOwnerRes = await isTokenOwner(web3, data.track.nftData.tokenId, account);
      setIsOwner(isTokenOwnerRes);
    };
    fetchIsOwner();
  }, [account, web3, data?.track.nftData, isTokenOwner]);

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || !data?.track.nftData?.tokenId) {
        return;
      }
      const royalties = await getRoyalties(web3, data.track.nftData.tokenId);
      setRoyalties(royalties);
    };
    fetchRoyalties();
  }, [account, web3, data?.track.nftData, getRoyalties]);

  const isForSale = !!listingPayload?.listingItem.listingItem?.pricePerItem ?? false;
  const price = web3?.utils.fromWei(listingPayload?.listingItem?.listingItem?.pricePerItem.toString() ?? '0', 'ether');

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'NFT Details',
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing && tokenId !== -1) {
        refetchListing({ tokenId: tokenId });
        refetchTrack({ id: trackId });
      }
    }, 5 * 1000);

    return () => clearInterval(interval);
  }, [isProcessing, refetchTrack, refetchListing, tokenId, trackId]);

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="p-3 flex flex-col gap-5">
        <Track trackId={trackId} />
        <Description description={data?.track.description || ''} />
      </div>
      <TrackInfo
        trackTitle={data?.track.title}
        albumTitle={data?.track.album}
        releaseYear={data?.track.releaseYear}
        genres={data?.track.genres}
        copyright={data?.track.copyright}
        mintingPending={mintingPending}
        artistProfile={profileInfo?.profile}
        royalties={royalties}
      />
      <MintingData
        transactionHash={data?.track.nftData?.transactionHash}
        ipfsCid={data?.track.nftData?.ipfsCid}
        ownerProfile={ownerProfile?.getUserByWallet?.profile as Partial<Profile>}
      />

      {isProcessing && !mintingPending && data?.track.nftData?.pendingRequest ? (
        <div className=" flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
          <div className="text-white text-sm pl-3 font-bold">
            Processing {pendingRequestMapping[data.track.nftData.pendingRequest]}
          </div>
        </div>
      ) : isOwner == undefined || loading ? (
        <div className=" flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
          <div className="text-white text-sm pl-3 font-bold">Loading</div>
        </div>
      ) : (
        <HandleNFT price={price} isOwner={isOwner} isForSale={isForSale} />
      )}
    </Layout>
  );
}
