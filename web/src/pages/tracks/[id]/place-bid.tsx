/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Matic } from 'components/Matic';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { WalletSelector } from 'components/WalletSelector';
import { useModalDispatch } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import useBlockchain from 'hooks/useBlockchain';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Auction } from 'icons/Auction';
import { Locker } from 'icons/Locker';
import { Matic as MaticIcon } from 'icons/Matic';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useAuctionItemQuery,
  useCountBidsQuery,
  useHaveBidedLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { authenticator } from 'otplib';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fixedDecimals, priceToShow } from 'utils/format';
import { compareWallets } from 'utils/Wallet';
import Web3 from 'web3';
import * as yup from 'yup';
import SEO from '../../../components/SEO';
import { Timer } from '../[id]';
import { HighestBid } from './complete-auction';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

interface FormValues {
  bidAmount: number;
  token: string;
}

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Place Bid',
};

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

  return cacheFor(PlaceBidPage, { track: data.track }, context, apolloClient);
});

export default function PlaceBidPage({ track }: TrackPageProps) {
  const me = useMe();
  const { getHighestBid } = useBlockchain();
  const { placeBid } = useBlockchainV2();
  const { account, web3, balance } = useWalletContext();
  const { dispatchShowBidsHistory } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [highestBid, setHighestBid] = useState<HighestBid>();
  const { setTopNavBarProps } = useLayoutContext();

  const tokenId = track.nftData?.tokenId ?? -1;

  const { data: { auctionItem } = {} } = useAuctionItemQuery({
    variables: { tokenId },
  });
  const [fetchHaveBided, { data: haveBided, refetch: refetchHaveBided }] = useHaveBidedLazyQuery({
    fetchPolicy: 'network-only',
  });
  const { data: countBids, refetch: refetchCountBids } = useCountBidsQuery({ variables: { tokenId } });
  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (account && auctionItem?.auctionItem?.id) {
      fetchHaveBided({ variables: { auctionId: auctionItem.auctionItem.id, bidder: account } });
    }
  }, [fetchHaveBided, auctionItem?.auctionItem?.id, account]);

  useEffect(() => {
    if (!web3) {
      return;
    }
    const fetchHighestBid = async () => {
      const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: track.nftData?.contract });
      setHighestBid({ bid: priceToShow(_bid), bidder: _bidder });
      refetchCountBids();
    };
    fetchHighestBid();
    const interval = setInterval(() => {
      fetchHighestBid();
    }, 6 * 1000);

    return () => clearInterval(interval);
  }, [tokenId, track, web3, getHighestBid, account, refetchCountBids]);

  useEffect(() => {
    if (highestBid) {
      fetchHighestBidder({
        variables: {
          walletAddress: highestBid.bidder,
        },
      });
    }
  }, [highestBid, fetchHighestBidder]);

  if (!auctionItem || !web3) {
    return null;
  }

  const isOwner = compareWallets(auctionItem.auctionItem?.owner, account);
  const isForSale = !!auctionItem.auctionItem?.reservePrice ?? false;
  const hasStarted = (auctionItem.auctionItem?.startingTime ?? 0) <= new Date().getTime() / 1000;
  const hasEnded = new Date().getTime() / 1000 > (auctionItem.auctionItem?.endingTime ?? 0);
  const startingDate = auctionItem.auctionItem?.startingTime
    ? new Date(auctionItem.auctionItem.startingTime * 1000)
    : undefined;
  const endingDate = auctionItem.auctionItem?.endingTime
    ? new Date(auctionItem.auctionItem.endingTime * 1000)
    : undefined;
  const futureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false;
  const isHighestBidder = highestBid ? compareWallets(highestBid.bidder, account) : undefined;
  const auctionIsOver = (auctionItem.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000);
  const bidCount = countBids?.countBids.numberOfBids ?? 0;
  let price: number;
  if (!highestBid || highestBid?.bid === 0) {
    price = auctionItem.auctionItem?.reservePriceToShow ?? 0;
  } else {
    price = highestBid.bid;
  }
  const minBid = fixedDecimals(price * 1.015);
  const validate = ({ bidAmount }: FormValues) => {
    const errors: any = {};
    if (bidAmount < minBid) {
      errors.bidAmount = `must be at least ${minBid}`;
    }
    return errors;
  };

  const handlePlaceBid = ({ bidAmount, token }: FormValues) => {
    if (token) {
      const isValid = authenticator.verify({ token, secret: me?.otpSecret || '' });
      if (!isValid) {
        toast.error('Invalid token code');
        return;
      }
    }

    if (!web3 || !auctionItem.auctionItem?.tokenId || !auctionItem.auctionItem?.owner || !account) {
      return;
    }
    const amount = Web3.utils.toWei(bidAmount.toString());

    if (bidAmount >= parseFloat(balance || '0')) {
      toast.warn("Uh-oh, it seems you don't have enough funds for this transaction");
      return;
    }

    placeBid(tokenId, account, amount)
      .onReceipt(() => {
        toast.success('Bid placed!');
        if (refetchHaveBided) refetchHaveBided();
        refetchCountBids();
      })
      .onError(() => {
        toast.warn('You may have been outbid. Please try again');
      })
      .finally(() => setLoading(false))
      .execute(web3);

    setLoading(true);
  };

  if (!isForSale || isOwner || !me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  const initialValues = {
    bidAmount: minBid,
    token: '',
  };

  const validationSchema = yup.object().shape({
    token: me?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  });

  return (
    <>
      <SEO
        title={`Place bid | SoundChain`}
        description={`Place a bid on ${track.title} - song by ${track.artist}`}
        canonicalUrl={`/tracks/${track.id}/place-bid/`}
        image={track.artworkUrl}
      />
      <div className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="m-4">
              <Track track={track} />
            </div>
            {isHighestBidder && (
              <div className="text-green-500 font-bold p-4 text-center">You have the highest bid!</div>
            )}
            {haveBided?.haveBided.bided && isHighestBidder !== undefined && !isHighestBidder && (
              <div className="text-red-500 font-bold p-4 text-center">You have been outbid!</div>
            )}
            <div className="bg-[#111920]">
              {futureSale && (
                <div className="flex justify-between items-center px-4 py-3 gap-3">
                  <div className="text-xs font-bold text-gray-80 flex-shrink-0">SALE STARTS</div>
                  <div className="text-xs flex items-center text-right font-bold gap-1">
                    <Timer date={startingDate!} reloadOnEnd />
                  </div>
                </div>
              )}
              {endingDate && !futureSale && (
                <div className="flex justify-between items-center px-4 py-3 gap-3">
                  <div className="text-xs font-bold text-gray-80  flex-shrink-0">TIME REMAINING</div>
                  <div className="text-xs flex items-center text-right font-bold gap-1">
                    <Timer date={endingDate} endedMessage="Auction Ended" reloadOnEnd />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 gap-3">
                <div className="text-xs font-bold text-gray-80 ">{auctionIsOver ? 'FINAL PRICE' : 'CURRENT PRICE'}</div>
                <div className="flex items-center font-bold gap-1">
                  <Matic value={price} variant="currency-inline" className="text-xs" />
                  <button
                    className="text-[#22CAFF] text-xxs cursor-pointer font-bold"
                    onClick={() => dispatchShowBidsHistory(true, auctionItem?.auctionItem?.id || '')}
                  >
                    [{bidCount} bids]
                  </button>
                </div>
              </div>
              {highestBidderData?.getUserByWallet && (
                <div className="text-white flex justify-between items-center px-4 py-3 gap-3">
                  <div className="text-xs text-gray-80 font-bold">HIGHEST BIDDER</div>
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <ProfileWithAvatar profile={highestBidderData?.getUserByWallet.profile} />
                  </div>
                </div>
              )}
              {isOwner && bidCount === 0 && auctionIsOver && (
                <div className="text-white flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold">RESULT</div>
                  <div className="text-md flex items-center font-bold gap-1">Auction ended with no bids</div>
                </div>
              )}
            </div>
          </div>
          {hasStarted && !hasEnded && (
            <Formik<FormValues>
              initialValues={initialValues}
              onSubmit={handlePlaceBid}
              enableReinitialize
              validate={validate}
              validationSchema={validationSchema}
            >
              {({ values: { bidAmount } }) => (
                <Form className="mb-16 bg-gray-20">
                  <div className="flex p-4 items-center uppercase">
                    <label htmlFor="bidAmount" className="w-full text-gray-80 font-bold text-xs md-text-sm">
                      <p>
                        <Auction className="h-4 w-4 inline mr-2" purple={false} /> bid amount
                      </p>
                      <p className="font-medium mt-1 text-xxs">
                        Must be at least 1% of current bid price. Enter{' '}
                        <span className="text-white font-bold cursor-pointer">{minBid}</span> MATIC or more.
                      </p>
                    </label>
                    <div className="w-1/2">
                      <InputField name="bidAmount" type="number" icon={MaticIcon} step="any" />
                    </div>
                  </div>
                  {me?.otpSecret && (
                    <div className="flex p-4 items-center uppercase">
                      <p className="text-gray-80 w-full font-bold text-xs">
                        <Locker className="h-4 w-4 inline mr-2" fill="#303030" /> Two-factor validation
                      </p>
                      <div className="w-1/2">
                        <InputField name="token" type="text" maxLength={6} pattern="[0-9]*" inputMode="numeric" />
                      </div>
                    </div>
                  )}
                  <WalletSelector ownerAddressAccount={account} />
                  <div className="py-3 px-4">
                    <MaxGasFee />
                  </div>

                  <PlayerAwareBottomBar>
                    <Matic className="flex-1" value={bidAmount} variant="currency" />
                    <Button type="submit" variant="buy-nft" loading={loading}>
                      <div className="px-4">CONFIRM BID</div>
                    </Button>
                  </PlayerAwareBottomBar>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </div>
    </>
  );
}
