/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Avatar } from 'components/Avatar';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Layout } from 'components/Layout';
import MaxGasFee from 'components/MaxGasFee';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { Track } from 'components/Track';
import { WalletSelector } from 'components/WalletSelector';
import { useModalDispatch } from 'contexts/providers/modal';
import { Form, Formik } from 'formik';
import useBlockchain from 'hooks/useBlockchain';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Auction } from 'icons/Auction';
import { Matic } from 'icons/Matic';
import { Locker } from 'icons/Locker';
import { cacheFor } from 'lib/apollo';
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useAuctionItemQuery,
  useCountBidsQuery,
  useHaveBidedLazyQuery,
  useMaticUsdQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { authenticator } from 'otplib';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { currency, fixedDecimals } from 'utils/format';
import { compareWallets } from 'utils/Wallet';
import * as yup from 'yup';
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
  const { account, web3 } = useWalletContext();
  const { data: maticQuery } = useMaticUsdQuery();
  const { dispatchShowBidsHistory } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const [highestBid, setHighestBid] = useState<HighestBid>();

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
    if (account && auctionItem?.auctionItem?.id) {
      fetchHaveBided({ variables: { auctionId: auctionItem.auctionItem.id, bidder: account } });
    }
  }, [fetchHaveBided, auctionItem?.auctionItem?.id, account]);

  useEffect(() => {
    if (!web3) {
      return;
    }
    const fetchHighestBid = async () => {
      const { _bid, _bidder } = await getHighestBid(web3, tokenId);
      setHighestBid({ bid: _bid, bidder: _bidder });
      refetchCountBids();
    };
    fetchHighestBid();
    const interval = setInterval(() => {
      fetchHighestBid();
    }, 10 * 1000);

    return () => clearInterval(interval);
  }, [tokenId, track.id, web3, getHighestBid, account, refetchCountBids]);

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
  let price: string;
  if (!highestBid || highestBid?.bid === '0') {
    price = web3.utils.fromWei(
      auctionItem.auctionItem?.reservePrice?.toLocaleString('fullwide', { useGrouping: false }) ?? '0',
      'ether',
    );
  } else {
    price = web3.utils.fromWei(highestBid.bid, 'ether');
  }
  const minBid = fixedDecimals(parseFloat(price) * 1.015);
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
    const amount = (bidAmount * 1e18).toString();

    placeBid(tokenId, account, amount)
      .onReceipt(() => {
        if (refetchHaveBided) refetchHaveBided();
        refetchCountBids();
      })
      .onError(() => {
        toast.warn('You may have been outbid. Please try again', { autoClose: 5 * 1000 });
      })
      .finally(() => setLoading(false))
      .execute(web3);

    setLoading(true);
  };

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: 'Place Bid',
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
    <Layout topNavBarProps={topNovaBarProps}>
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
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold text-white flex-shrink-0">SALE STARTS</div>
                  <div className="text-md flex items-center text-right font-bold gap-1">
                    <Timer date={startingDate!} reloadOnEnd />
                  </div>
                </div>
              )}
              {endingDate && !futureSale && (
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold text-white flex-shrink-0">TIME REMAINING</div>
                  <div className="text-md flex items-center text-right font-bold gap-1">
                    <Timer date={endingDate} endedMessage="Auction Ended" reloadOnEnd />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3">
                <div className="text-sm font-bold text-white">{auctionIsOver ? 'FINAL PRICE' : 'CURRENT PRICE'}</div>
                <div className="text-md flex items-center font-bold gap-1">
                  <Matic />
                  <span className="text-white">{price}</span>
                  <span className="text-xxs text-gray-80">MATIC</span>
                  <span
                    className="text-[#22CAFF] text-xxs cursor-pointer"
                    onClick={() => dispatchShowBidsHistory(true, auctionItem?.auctionItem?.id || '')}
                  >
                    [{bidCount} bids]
                  </span>
                </div>
              </div>
              {highestBidderData?.getUserByWallet && (
                <div className="text-white flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold">HIGHEST BIDDER</div>
                  <div className="flex items-center gap-2">
                    <Avatar
                      profile={{
                        profilePicture: highestBidderData?.getUserByWallet.profile.profilePicture,
                        userHandle: highestBidderData?.getUserByWallet.profile.userHandle,
                      }}
                      pixels={30}
                      linkToProfile
                    />
                    <div className="flex flex-col ">
                      <div className="text-sm font-bold">{highestBidderData?.getUserByWallet.profile.displayName}</div>
                      <div className="text-xxs text-gray-CC font-bold">
                        @{highestBidderData?.getUserByWallet.profile.userHandle}
                      </div>
                    </div>
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
                      <InputField name="bidAmount" type="number" icon={Matic} step="any" />
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
                    <div className="flex-1 font-black text-xs">
                      <div className="flex items-center gap-2 text-white">
                        <Matic />
                        <div className="text-white">{bidAmount}</div>MATIC
                      </div>
                      {maticQuery?.maticUsd && (
                        <span className="text-xs text-gray-50 font-bold">
                          {`${currency(bidAmount * parseFloat(maticQuery?.maticUsd))} USD`}
                        </span>
                      )}
                    </div>
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
    </Layout>
  );
}
