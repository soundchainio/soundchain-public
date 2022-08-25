import { Button } from 'components/Button'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { Auction } from 'icons/Auction'
import { CheckmarkFilled } from 'icons/CheckmarkFilled'
import { useTrackQuery } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

const topNavBarProps: TopNavBarProps = {
  title: 'Select Listing Type',
}

export default function ListPage() {
  const router = useRouter()
  const { setTopNavBarProps } = useLayoutContext()

  const { data, loading } = useTrackQuery({
    variables: {
      id: router.query.id as string,
    },
  })

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  if (loading) {
    return null
  }

  return (
    <>
      <SEO
        title={`List track | SoundChain`}
        description={'List your track on SoundChain'}
        canonicalUrl={router.asPath}
      />
      <div className="flex flex-col gap-3">
        <div>
          <div className="m-3 flex flex-col gap-4 rounded border-2 border-gray-700 bg-black p-4">
            <div className="flex flex-row gap-2">
              <CheckmarkFilled className="h-6 w-6" />
              <p className="text-sm font-bold text-white">Buy it Now</p>
            </div>
            <p className="text-xs text-white">
              With a fixed-price Buy It Now listing, a buyer knows the exact price they need to pay for your NFT and can
              complete their purchase immediately. There is no bidding on fixed-price listings.
            </p>
            <NextLink href={`${router.asPath}/buy-now`} replace>
              <Button variant="outline" borderColor="bg-green-gradient" className="h-10 w-1/2">
                BUY NOW LISTING
              </Button>
            </NextLink>
          </div>
        </div>
        {!data?.track.editionSize && (
          <div>
            <div className="m-3 flex flex-col gap-4 rounded border-2 border-gray-700 bg-black p-4">
              <div className="flex flex-row gap-2">
                <Auction className="h-6 w-6" purple />
                <p className="text-sm font-bold text-white">Auction</p>
              </div>
              <p className="text-xs text-white">
                When you list an NFT for sale in an auction, you choose a starting price, time limit, and a reserve
                price. Interested buyers will place bids and when the auction ends, your NFT is sold to the highest
                bidder as long as it meets the reserve price.
              </p>
              <NextLink href={`${router.asPath}/auction`} replace>
                <Button variant="outline" borderColor="bg-purple-gradient" className="h-10 w-1/2">
                  AUCTION LISTING
                </Button>
              </NextLink>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
