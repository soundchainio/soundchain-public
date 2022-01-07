import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { AuctionEnded } from 'components/details-NFT/AuctionEnded';
import { Layout } from 'components/Layout';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { TotalPrice } from 'components/TotalPrice';
import { Track } from 'components/Track';
import useBlockchain from 'hooks/useBlockchain';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import { Matic } from 'components/Matic';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useAuctionItemQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { compareWallets } from 'utils/Wallet';
import SEO from '../../../components/SEO';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

export interface HighestBid {
  bid: string;
  bidder: string;
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;

  if (!trackId) {
    return { notFound: true };
  }

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(CompleteAuctionPage, { track: data.track }, context, apolloClient);
});

export default function CompleteAuctionPage({ track }: TrackPageProps) {
  const { resultAuction, getHighestBid } = useBlockchain();
  const { account, web3 } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const [loading, setLoading] = useState(false);
  const [highestBid, setHighestBid] = useState<HighestBid>({} as HighestBid);
  const me = useMe();
  const router = useRouter();
  const tokenId = track.nftData?.tokenId ?? -1;

  const { data: auctionItem } = useAuctionItemQuery({
    variables: { tokenId },
  });

  useEffect(() => {
    const fetchHighestBid = async () => {
      if (!web3 || !tokenId || !getHighestBid || highestBid.bidder) {
        return;
      }
      const { _bid, _bidder } = await getHighestBid(web3, tokenId);
      setHighestBid({ bid: _bid, bidder: _bidder });
    };
    fetchHighestBid();
  }, [tokenId, web3, getHighestBid, highestBid.bidder]);

  if (!auctionItem) {
    return null;
  }

  const isOwner = compareWallets(auctionItem.auctionItem.auctionItem?.owner, account);
  const saleEnded = (auctionItem.auctionItem?.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000);

  const handleClaim = () => {
    if (!web3 || !auctionItem.auctionItem?.auctionItem?.tokenId || !account) {
      return;
    }
    const onTransactionHash = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.CompleteAuction,
            },
          },
        },
      });
      router.push(router.asPath.replace('complete-auction', ''));
    };
    resultAuction(web3, tokenId, account, onTransactionHash);
    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Complete Auction',
  };

  if (
    (account !== highestBid.bidder && !isOwner) ||
    !saleEnded ||
    !me ||
    track.nftData?.pendingRequest != PendingRequest.None
  ) {
    return null;
  }

  const winningBid = (parseFloat(highestBid.bid) / 1e18).toFixed(6);

  return (
    <>
      <SEO
        title={`Soundchain - Complete auction of Track - ${track.title}`}
        description={track.artist || 'on Soundchain'}
        canonicalUrl={`/tracks/${track.id}/complete-auction/`}
        image={track.artworkUrl}
      />
      <Layout topNavBarProps={topNovaBarProps}>
        <div className="min-h-full flex flex-col">
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="m-4">
                <Track track={track} />
              </div>
              <p className="m-8 text-center text-green-600 text-xs font-bold">
                <CheckmarkFilled className="inline" /> Congrats, you {isOwner ? 'sold' : 'won'} this NFT!
              </p>
              <div className="flex p-5 text-gray-80 bg-[#111920]">
                <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
                  winning bid
                </p>
                <p className="flex items-center justify-end w-full">
                  <Matic value={winningBid} />
                </p>
              </div>
              <div className="flex p-5 text-gray-80 bg-[#111920]">
                <p className="flex items-center flex-shrink-0 justify-start font-bold text-xs md-text-sm uppercase">
                  time reaming
                </p>
                <p className="flex items-center w-full justify-end">
                  <span className="mx-1 text-red-500 font-bold text-xs leading-tight uppercase">auction ended</span>
                </p>
              </div>
            </div>

            <AuctionEnded highestBid={highestBid} />
          </div>
          <PlayerAwareBottomBar>
            <TotalPrice price={winningBid} />
            <Button className="ml-auto" variant="buy-nft" onClick={handleClaim} loading={loading}>
              <div className="px-4">COMPLETE</div>
            </Button>
          </PlayerAwareBottomBar>
        </div>
      </Layout>
    </>
  );
}
