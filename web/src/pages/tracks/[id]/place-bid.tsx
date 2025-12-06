/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Button } from 'components/common/Buttons/Button'
import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import MaxGasFee from 'components/MaxGasFee'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { TopNavBarProps } from 'components/TopNavBar'
import { Track } from 'components/Track'
import { Timer } from 'components/pages/TrackDetailsPage'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { useModalDispatch } from 'contexts/ModalContext'
import { Form, Formik } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { Auction } from 'icons/Auction'
import { Locker } from 'icons/Locker'
import { Matic as MaticIcon } from 'icons/Matic'
import { cacheFor } from 'lib/apollo'
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useAuctionItemQuery,
  useCountBidsQuery,
  useHaveBidedLazyQuery,
  useUserByWalletLazyQuery,
} from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { authenticator } from 'otplib'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { fixedDecimals, priceToShow } from 'utils/format'
import { compareWallets } from 'utils/Wallet'
import Web3 from 'web3'
import * as yup from 'yup'
import SEO from '../../../components/SEO'
import { HighestBid } from './complete-auction'

export interface TrackPageProps {
  track: TrackQuery['track']
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

interface FormValues {
  bidAmount: number
  token: string
}

const topNavBarProps: TopNavBarProps = {
  title: 'Place Bid',
}

export const getServerSideProps = protectPage<TrackPageProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId = context.params?.id

  if (!trackId) {
    return { notFound: true }
  }

  const { data, error } = await apolloClient.query({
    query: TrackDocument,
    variables: { id: trackId },
    context,
  })
  if (error) {
    return { notFound: true }
  }

  return cacheFor(PlaceBidPage, { track: data.track }, context, apolloClient)
})

export default function PlaceBidPage({ track }: TrackPageProps) {
  const me = useMe()
  const { getHighestBid } = useBlockchain()
  const { placeBid } = useBlockchainV2()
  const { account, web3, balance } = useWalletContext()
  const { dispatchShowBidsHistory } = useModalDispatch()
  const [loading, setLoading] = useState(false)
  const [highestBid, setHighestBid] = useState<HighestBid>()
  const { setTopNavBarProps } = useLayoutContext()

  const router = useRouter()
  const tokenId = track.nftData?.tokenId ?? -1
  const contractAddress = track.nftData?.contract ?? ''

  const { data: { auctionItem } = {} } = useAuctionItemQuery({
    variables: { tokenId },
  })

  const [fetchHaveBided, { data: haveBided, refetch: refetchHaveBided }] = useHaveBidedLazyQuery({
    fetchPolicy: 'network-only',
  })
  const { data: countBids, refetch: refetchCountBids } = useCountBidsQuery({ variables: { tokenId } })
  const [fetchHighestBidder, { data: highestBidderData }] = useUserByWalletLazyQuery()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (account && auctionItem?.auctionItem?.id) {
      fetchHaveBided({ variables: { auctionId: auctionItem.auctionItem.id, bidder: account } })
    }
  }, [fetchHaveBided, auctionItem?.auctionItem?.id, account])

  useEffect(() => {
    if (!web3) {
      return
    }
    const fetchHighestBid = async () => {
      const { _bid, _bidder } = await getHighestBid(web3, tokenId, { nft: track.nftData?.contract })
      setHighestBid({ bid: priceToShow(_bid), bidder: _bidder })
      refetchCountBids()
    }
    fetchHighestBid()
    const interval = setInterval(() => {
      fetchHighestBid()
    }, 6 * 1000)

    return () => clearInterval(interval)
  }, [tokenId, track, web3, getHighestBid, account, refetchCountBids])

  useEffect(() => {
    if (highestBid) {
      fetchHighestBidder({
        variables: {
          walletAddress: highestBid.bidder,
        },
      })
    }
  }, [highestBid, fetchHighestBidder])

  if (!auctionItem || !web3) {
    return null
  }

  const isOwner = compareWallets(auctionItem.auctionItem?.owner, account)
  const isForSale = !!auctionItem.auctionItem?.reservePrice // Removed ?? false
  const hasStarted = (auctionItem.auctionItem?.startingTime ?? 0) <= new Date().getTime() / 1000
  const hasEnded = new Date().getTime() / 1000 > (auctionItem.auctionItem?.endingTime ?? 0)
  const startingDate = auctionItem.auctionItem?.startingTime
    ? new Date(auctionItem.auctionItem.startingTime * 1000)
    : undefined
  const endingDate = auctionItem.auctionItem?.endingTime
    ? new Date(auctionItem.auctionItem.endingTime * 1000)
    : undefined
  const futureSale = startingDate ? startingDate.getTime() > new Date().getTime() : false
  const isHighestBidder = highestBid ? compareWallets(highestBid.bidder, account) : undefined
  const auctionIsOver = (auctionItem.auctionItem?.endingTime || 0) < Math.floor(Date.now() / 1000)
  const bidCount = countBids?.countBids.numberOfBids ?? 0
  let price: number
  if (!highestBid || highestBid?.bid === 0) {
    price = auctionItem.auctionItem?.reservePriceToShow ?? 0
  } else {
    price = highestBid.bid
  }
  const minBid = fixedDecimals(price * 1.015)
  const validate = ({ bidAmount }: FormValues) => {
    const errors: any = {}
    if (bidAmount < minBid) {
      errors.bidAmount = `must be at least ${minBid}`
    }
    return errors
  }

  const handlePlaceBid = ({ bidAmount, token }: FormValues) => {
    if (token) {
      const isValid = authenticator.verify({ token, secret: (me as any)?.otpSecret || '' })
      if (!isValid) {
        toast.error('Invalid token code')
        return
      }
    }

    if (!web3 || !auctionItem.auctionItem?.tokenId || !auctionItem.auctionItem?.owner || !account) {
      return
    }
    const amount = Web3.utils.toWei(bidAmount.toString(), 'ether') // Added 'ether' as the second argument

    if (bidAmount >= parseFloat(balance || '0')) {
      toast.warn("Uh-oh, it seems you don't have enough funds for this transaction")
      return
    }

    setLoading(true)
    placeBid(tokenId, account, amount, {
      nft: contractAddress,
      auction: auctionItem.auctionItem.contract,
    })
      .onReceipt(receipt => {
        console.log('Your transaction receipt: ', receipt)
        toast.success('Bid placed!')
        if (refetchHaveBided) refetchHaveBided()
        refetchCountBids()
      })
      .onError(error => {
        console.log('Error on your transaction: ', error)
        toast.warn('You may have been outbid. Please try again')
      })
      .finally(() => {
        setLoading(false)
        router.push(`/tracks/${router.query.id}`)
      })
      .execute(web3)
  }

  if (!isForSale || isOwner || !me || track.nftData?.pendingRequest != PendingRequest.None) {
    return null
  }

  const initialValues = {
    bidAmount: minBid,
    token: '',
  }

  const validationSchema = yup.object().shape({
    token: (me as any)?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  })

  return (
    <>
      <SEO
        title={`Place bid | SoundChain`}
        description={`Place a bid on ${track.title} - song by ${track.artist}`}
        canonicalUrl={`/tracks/${track.id}/place-bid/`}
        image={track.artworkUrl}
      />
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="m-4">
              <Track track={track} />
            </div>
            {isHighestBidder && (
              <div className="p-4 text-center font-bold text-green-500">You have the highest bid!</div>
            )}
            {haveBided?.haveBided.bided && isHighestBidder !== undefined && !isHighestBidder && (
              <div className="p-4 text-center font-bold text-red-500">You have been outbid!</div>
            )}
            <div className="bg-[#111920]">
              {futureSale && (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex-shrink-0 text-xs font-bold text-gray-80">SALE STARTS</div>
                  <div className="flex items-center gap-1 text-right text-xs font-bold">
                    <Timer date={startingDate!} reloadOnEnd />
                  </div>
                </div>
              )}
              {endingDate && !futureSale && (
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex-shrink-0 text-xs font-bold  text-gray-80">TIME REMAINING</div>
                  <div className="flex items-center gap-1 text-right text-xs font-bold">
                    <Timer date={endingDate} endedMessage="Auction Ended" reloadOnEnd />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="text-xs font-bold text-gray-80 ">{auctionIsOver ? 'FINAL PRICE' : 'CURRENT PRICE'}</div>
                <div className="flex items-center gap-1 font-bold">
                  <Matic value={price} variant="currency-inline" className="text-xs" />
                  <button
                    className="cursor-pointer text-xxs font-bold text-[#22CAFF]"
                    onClick={() => dispatchShowBidsHistory(true, auctionItem?.auctionItem?.id || '')}
                  >
                    [{bidCount} bids]
                  </button>
                </div>
              </div>
              {highestBidderData?.getUserByWallet && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
                  <div className="text-xs font-bold text-gray-80">HIGHEST BIDDER</div>
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    <ProfileWithAvatar profile={highestBidderData?.getUserByWallet.profile} />
                  </div>
                </div>
              )}
              {isOwner && bidCount === 0 && auctionIsOver && (
                <div className="flex items-center justify-between px-4 py-3 text-white">
                  <div className="text-sm font-bold">RESULT</div>
                  <div className="text-md flex items-center gap-1 font-bold">Auction ended with no bids</div>
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
              {({ values, handleChange, ...formikProps }) => ( // Added render prop with formikProps
                <Form className="mb-16 bg-gray-20" {...(formikProps as any)}> {/* Spread formikProps */}
                  <div className="flex items-center p-4 uppercase">
                    <label htmlFor="bidAmount" className="md-text-sm w-full text-xs font-bold text-gray-80">
                      <p>
                        <Auction className="mr-2 inline h-4 w-4" purple={false} /> bid amount
                      </p>
                      <p className="mt-1 text-xxs font-medium">
                        Must be at least 1% of current bid price. Enter{' '}
                        <span className="cursor-pointer font-bold text-white">{minBid}</span> MATIC or more.
                      </p>
                    </label>
                    <div className="w-1/2">
                      <InputField name="bidAmount" type="number" icon={MaticIcon} step="any" value={values.bidAmount} onChange={handleChange} />
                    </div>
                  </div>
                  {(me as any)?.otpSecret && (
                    <div className="flex items-center p-4 uppercase">
                      <p className="w-full text-xs font-bold text-gray-80">
                        <Locker className="mr-2 inline h-4 w-4" fill="#303030" /> Two-factor validation
                      </p>
                      <div className="w-1/2">
                        <InputField name="token" type="text" maxLength={6} pattern="[0-9]*" inputMode="numeric" value={values.token} onChange={handleChange} />
                      </div>
                    </div>
                  )}
                  <WalletSelector ownerAddressAccount={account} />
                  <div className="py-3 px-4">
                    <MaxGasFee />
                  </div>

                  <PlayerAwareBottomBar>
                    <Matic className="flex-1" value={values.bidAmount} variant="currency" />
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
  )
}
