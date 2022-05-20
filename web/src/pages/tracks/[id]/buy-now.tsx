
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { BuyNow } from 'components/details-NFT/BuyNow';
import { InputField } from 'components/InputField';
import { Matic } from 'components/Matic';
import { Ogun } from 'components/Ogun';
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { TotalPrice } from 'components/TotalPrice';
import { Track } from 'components/Track';
import { config } from 'config';
import { Form, Formik } from 'formik';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { Locker } from 'icons/Locker';
import { cacheFor } from 'lib/apollo';
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useRouter } from 'next/router';
import { authenticator } from 'otplib';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { compareWallets } from 'utils/Wallet';
import Web3 from 'web3';
import { Contract } from "web3-eth-contract";
import { AbiItem } from 'web3-utils';
import * as yup from 'yup';
import SoundchainOGUN20 from '../../../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import { Timer } from '../[id]';

export interface TrackPageProps {
  track: TrackQuery['track'];
}

interface BuyNowTrackProps {
  track: TrackQuery['track'];
  isPaymentOGUN: boolean;
}
interface TrackPageParams extends ParsedUrlQuery {
  id: string;
}

interface FormValues {
  token: string;
}


const marketplaceAddress = config.marketplaceAddress as string;
const OGUNAddress = config.OGUNAddress as string;
const tokenContract = (web3: Web3) =>
  new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress) as unknown as Contract;

export const getServerSideProps = protectPage<BuyNowTrackProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id;
  const isPaymentOGUN = context.query?.isPaymentOGUN;

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

  return cacheFor(BuyNowPage, { track: data.track, isPaymentOGUN: isPaymentOGUN === 'true' }, context, apolloClient);
});

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Confirm Purchase',
};

export default function BuyNowPage({ track, isPaymentOGUN }: BuyNowTrackProps) {
  const { buyItem } = useBlockchainV2();
  const { account, web3, balance } = useWalletContext();
  const [trackUpdate] = useUpdateTrackMutation();
  const [loading, setLoading] = useState(false);
  const [OGUNBalance, setOGUNBalance] = useState<string>('0');
  const router = useRouter();
  const me = useMe();
  const { setTopNavBarProps } = useLayoutContext();

  const nftData = track.nftData;
  const tokenId = nftData?.tokenId ?? -1;

  const [getBuyNowItem, { data: listingPayload }] = useBuyNowItemLazyQuery({
    variables: { tokenId },
    fetchPolicy: 'network-only',
  });


  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call();
    const formattedBalance = web3.utils.fromWei(currentBalance ?? '0');
    setOGUNBalance(formattedBalance);
  }

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  useEffect(() => {
    getBuyNowItem();
  }, [getBuyNowItem]);


  useEffect(() => {
    if (account && web3 && isPaymentOGUN) {
      getOGUNBalance(web3);
    }
  }, [account, web3]);

  if (!listingPayload) {
    return null;
  }

  const isOwner = compareWallets(listingPayload.buyNowItem?.buyNowItem?.owner, account);
  const isForSale = (!!listingPayload.buyNowItem?.buyNowItem?.pricePerItem || !!listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItem) ?? false;
  const priceToShow = isPaymentOGUN ? 
    (listingPayload.buyNowItem.buyNowItem?.OGUNPricePerItemToShow ?? 0) : 
    (listingPayload.buyNowItem.buyNowItem?.pricePerItemToShow ?? 0);
  const startTime = listingPayload.buyNowItem?.buyNowItem?.startingTime ?? 0;
  const hasStarted = startTime <= new Date().getTime() / 1000;

  const handleSubmit = ({ token }: FormValues) => {
    if (token) {
      const isValid = authenticator.verify({ token, secret: me?.otpSecret || '' });
      if (!isValid) {
        toast.error('Invalid token code');
        return;
      }
    }

    if (
      !web3 ||
      !listingPayload.buyNowItem?.buyNowItem?.tokenId ||
      !listingPayload.buyNowItem?.buyNowItem?.owner ||
      !account
    ) {
      return;
    }

    const checkBalance = (balance:string) => {
      if (priceToShow >= parseFloat(balance || '0')) {
        toast.warn("Uh-oh, it seems you don't have enough funds for this transaction");
        return;
      }
    }

    const approveOGUNTransferFrom = async (amount?: number) => {
      if (amount) {
        await tokenContract(web3).methods.approve(marketplaceAddress, amount.toString()).send({from:account});
      }
    }

    isPaymentOGUN ? checkBalance(OGUNBalance) : checkBalance(balance ?? '0');

    const onReceipt = async () => {
      await trackUpdate({
        variables: {
          input: {
            trackId: track.id,
            nftData: {
              pendingRequest: PendingRequest.Buy,
              pendingTime: new Date().toISOString(),
            },
          },
        },
      });
      router.replace(router.asPath.replace('buy-now', ''));
    };

    setLoading(true);

    isPaymentOGUN && approveOGUNTransferFrom(+listingPayload.buyNowItem?.buyNowItem?.pricePerItem); 
    
    buyItem(
      listingPayload.buyNowItem?.buyNowItem?.tokenId,
      account,
      listingPayload.buyNowItem?.buyNowItem?.owner,
      isPaymentOGUN,
      listingPayload.buyNowItem?.buyNowItem?.pricePerItem,
    )
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3);
  };

  if (!isForSale || isOwner || !me || nftData?.pendingRequest != PendingRequest.None) {
    return null;
  }

  const initialValues = {
    token: '',
  };

  const validationSchema = yup.object().shape({
    token: me?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  });

  return (
    <>
      <SEO
        title={`Buy now | SoundChain`}
        description={`Buy now ${track.title} - song by ${track.artist}.`}
        canonicalUrl={`/tracks/${track.id}/buy-now/`}
        image={track.artworkUrl}
      />
      <div className="min-h-full flex flex-col">
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          <Form autoComplete="off" className="flex flex-1 flex-col justify-between">
            <div>
              <div className="m-4">
                <Track track={track} />
              </div>
              <div className="bg-[#112011]">
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold text-white">BUY NOW PRICE</div>
                  {isPaymentOGUN ? (
                    <Ogun value={priceToShow} />
                  ):(
                    <Matic value={priceToShow} />
                  )}
                </div>
              </div>
              {!hasStarted && (
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="text-sm font-bold text-white flex-shrink-0">SALE STARTS</div>
                  <div className="text-md flex items-center text-right font-bold gap-1">
                    <Timer date={new Date(startTime * 1000)} reloadOnEnd />
                  </div>
                </div>
              )}
            </div>

            {me?.otpSecret && (
              <div className="flex px-4 py-3 items-center uppercase bg-gray-20">
                <p className="text-gray-80 w-full font-bold text-xs">
                  <Locker className="h-4 w-4 inline mr-2" fill="#303030" /> Two-factor validation
                </p>
                <div className="w-1/2">
                  <InputField name="token" type="text" maxLength={6} pattern="[0-9]*" inputMode="numeric" />
                </div>
              </div>
            )}
            {priceToShow && account && (
              <BuyNow price={priceToShow} priceOGUN={priceToShow} isPaymentOGUN={isPaymentOGUN} ownerAddressAccount={account} startTime={startTime} />
            )}
            {hasStarted && (
              <PlayerAwareBottomBar>
                <TotalPrice price={priceToShow} isPaymentOGUN={isPaymentOGUN} />
                <Button type="submit" className="ml-auto" variant="buy-nft" loading={loading}>
                  <div className="px-4">CONFIRM</div>
                </Button>
              </PlayerAwareBottomBar>
            )}
          </Form>
        </Formik>
      </div>
    </>
  );
}
