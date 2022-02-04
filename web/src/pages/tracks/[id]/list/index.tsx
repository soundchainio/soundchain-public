import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { Auction } from 'icons/Auction';
import { CheckmarkFilled } from 'icons/CheckmarkFilled';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Select Listing Type',
};

export default function ListPage() {
  const router = useRouter();
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  return (
    <>
      <SEO
        title={`List track | SoundChain`}
        description={'List your track on SoundChain'}
        canonicalUrl={router.asPath}
      />
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-col bg-black border-2 border-gray-700 rounded m-3 p-4 gap-4">
            <div className="flex flex-row gap-2">
              <CheckmarkFilled className="h-6 w-6" />
              <p className="text-white font-bold text-sm">Buy it Now</p>
            </div>
            <p className="text-white text-xs">
              With a fixed-price Buy It Now listing, a buyer knows the exact price they need to pay for your NFT and can
              complete their purchase immediately. There is no bidding on fixed-price listings.
            </p>
            <NextLink href={`${router.asPath}/buy-now`}>
              <Button variant="outline" borderColor="bg-green-gradient" className="h-10 w-1/2">
                BUY NOW LISTING
              </Button>
            </NextLink>
          </div>
        </div>
        <div>
          <div className="flex flex-col bg-black border-2 border-gray-700 rounded m-3 p-4 gap-4">
            <div className="flex flex-row gap-2">
              <Auction className="h-6 w-6" purple />
              <p className="text-white font-bold text-sm">Auction</p>
            </div>
            <p className="text-white text-xs">
              When you list an NFT for sale in an auction, you choose a starting price, time limit, and a reserve price.
              Interested buyers will place bids and when the auction ends, your NFT is sold to the highest bidder as
              long as it meets the reserve price.
            </p>
            <NextLink href={`${router.asPath}/auction`}>
              <Button variant="outline" borderColor="bg-purple-gradient" className="h-10 w-1/2">
                AUCTION LISTING
              </Button>
            </NextLink>
          </div>
        </div>
      </div>
    </>
  );
}
