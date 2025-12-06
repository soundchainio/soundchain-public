import { Button } from 'components/common/Buttons/Button'
import { BuyNow } from 'components/pages/details-NFT/BuyNow'
import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import PlayerAwareBottomBar from 'components/PlayerAwareBottomBar'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { TotalPrice } from 'components/TotalPrice'
import { Track } from 'components/Track'
import { Timer } from 'components/pages/TrackDetailsPage'
import { config } from 'config'
import { Form, Formik } from 'formik'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { Locker } from 'icons/Locker'
import { cacheFor } from 'lib/apollo'
import { PendingRequest, TrackDocument, TrackQuery, useBuyNowItemLazyQuery, useUpdateTrackMutation } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { authenticator } from 'otplib'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { compareWallets } from 'utils/Wallet'
import Web3 from 'web3'
import { TransactionReceipt } from 'web3-core/types'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import * as yup from 'yup'
import SoundchainOGUN20 from '../../../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'

// Define a type compatible with Web3.js v4.x receipt event, making contractAddress optional
interface Web3Receipt {
  transactionHash: string;
  transactionIndex: bigint;
  blockHash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  cumulativeGasUsed: bigint;
  gasUsed: bigint;
  contractAddress?: string | null | undefined; // Made optional with union type
  logs: any[];
  status: bigint;
  logsBloom: string;
  events?: any;
}

export interface TrackPageProps {
  track: TrackQuery['track']
}

interface BuyNowTrackProps {
  track: TrackQuery['track']
  isPaymentOGUN: boolean
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

interface FormValues {
  token: string
}

const marketplaceAddress = config.web3.contractsV2.marketplaceAddress as string
const OGUNAddress = config.ogunTokenAddress as string
const tokenContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], OGUNAddress)
}

export const getServerSideProps = protectPage<BuyNowTrackProps, TrackPageParams>(async (context, apolloClient) => {
  const trackId: string = context.params?.id || ''
  const isPaymentOGUN = (context.query?.isPaymentOGUN as string | undefined) || 'false'

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

  return cacheFor(BuyNowPage, { track: data.track, isPaymentOGUN: isPaymentOGUN === 'true' }, context, apolloClient)
})

const topNavBarProps: TopNavBarProps = {
  title: 'Confirm Purchase',
}

export default function BuyNowPage({ track, isPaymentOGUN }: BuyNowTrackProps) {
  const { buyItem } = useBlockchainV2()
  const { account, web3, balance } = useWalletContext()
  const [trackUpdate] = useUpdateTrackMutation()
  const [loading, setLoading] = useState(true)
  const [OGUNBalance, setOGUNBalance] = useState<string>('0')
  const router = useRouter()
  const me = useMe()
  const { setTopNavBarProps } = useLayoutContext()

  const nftData = track.nftData
  const tokenId = nftData?.tokenId ?? -1
  const contractAddress = nftData?.contract ?? ''
  const [hasAllowance, setHasAllowance] = useState<boolean>(false)

  const [getBuyNowItem, { data: listingPayload }] = useBuyNowItemLazyQuery({
    variables: { input: { tokenId, contractAddress } },
    fetchPolicy: 'network-only',
  })

  const getOGUNBalance = async (web3: Web3) => {
    const currentBalance = await tokenContract(web3).methods.balanceOf(account).call() as string | undefined
    const validBalance = currentBalance !== undefined && (typeof currentBalance === 'string' || typeof currentBalance === 'number')
      ? currentBalance.toString()
      : '0'
    const formattedBalance = web3.utils.fromWei(validBalance, 'ether')
    setOGUNBalance(formattedBalance)
  }

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  useEffect(() => {
    getBuyNowItem()
  }, [getBuyNowItem])

  useEffect(() => {
    if (listingPayload && !isPaymentOGUN) setLoading(false)
    if (account && web3 && isPaymentOGUN) {
      getOGUNBalance(web3)

      const validateAllowance = async () => {
        const existingAllowance = await tokenContract(web3)
          .methods.allowance(account, marketplaceAddress)
          .call() as string | undefined
        if (listingPayload) {
          const OGUNPrice = listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItem
          const hasEnoughAllowance = existingAllowance !== undefined && OGUNPrice !== undefined
            ? parseFloat(existingAllowance) >= parseFloat(OGUNPrice)
            : false // Default to false if either value is undefined
          console.log(
            `Your existing allowance for contract: ${marketplaceAddress} is ${existingAllowance} validating an amount of ${OGUNPrice}`,
          )
          setHasAllowance(hasEnoughAllowance)
          setLoading(false)
        }
      }
      validateAllowance()
    }
  }, [account, web3, isPaymentOGUN, listingPayload])

  if (!listingPayload) {
    return null
  }

  const isOwner = compareWallets(listingPayload.buyNowItem?.buyNowItem?.owner, account)
  const isForSale =
    (!!listingPayload.buyNowItem?.buyNowItem?.pricePerItem ||
      !!listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItem) ??
    false
  const salePrice =
    (isPaymentOGUN
      ? listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItem
      : listingPayload.buyNowItem?.buyNowItem?.pricePerItem) ?? '0'
  const priceToShow = isPaymentOGUN
    ? listingPayload.buyNowItem.buyNowItem?.OGUNPricePerItemToShow ?? 0
    : listingPayload.buyNowItem.buyNowItem?.pricePerItemToShow ?? 0
  const startTime = listingPayload.buyNowItem?.buyNowItem?.startingTime ?? 0
  const hasStarted = startTime <= new Date().getTime() / 1000

  const handleApproveAllowance = async () => {
    if (listingPayload && web3) {
      const OGUNItemPrice = listingPayload.buyNowItem?.buyNowItem?.OGUNPricePerItem as string
      const fixedAmount = Web3.utils.toWei((+OGUNItemPrice * 10 ** -18).toString(), 'wei')
      const amountBN = BigInt(fixedAmount)
      const gasPriceWei = await web3.eth.getGasPrice()
      console.log(`Approving new allowance of ${amountBN} using a gas price: ${gasPriceWei}`)
      setLoading(true)
      await tokenContract(web3)
        .methods.approve(marketplaceAddress, amountBN)
        .send({ from: account, gasPrice: gasPriceWei.toString() })
        .on('receipt', (receipt: Web3Receipt) => {
          toast.success('Successfully increased your allowance for the marketplace.')
          setHasAllowance(true)
          setLoading(false)
          console.log('Your transaction receipt: ', receipt)
        })
        .on('error', (error: Error) => {
          setHasAllowance(false)
          setLoading(false)
          toast.error('We were unable to process the new allowance transaction at this moment.')
          console.log(error)
        })
        .catch((reason: unknown) => { // Updated to unknown type
          const error = reason as Error; // Cast to Error if possible
          setHasAllowance(false)
          setLoading(false)
          toast.error('We were unable to process the new allowance at this moment.')
          console.log(error)
        })
    }
  }

  const handleSubmit = ({ token }: FormValues) => {
    if (token) {
      const isValid = authenticator.verify({ token, secret: (me as any)?.otpSecret || '' })
      if (!isValid) {
        toast.error('Invalid token code')
        return
      }
    }

    if (
      !web3 ||
      !listingPayload.buyNowItem?.buyNowItem?.tokenId ||
      !listingPayload.buyNowItem?.buyNowItem?.owner ||
      !account
    ) {
      return
    }

    const checkBalance = (balance: string | undefined) => {
      if (priceToShow >= parseFloat(balance || '0')) {
        toast.warn("Uh-oh, it seems you don't have enough funds for this transaction")
        return false
      }
      return true
    }

    // If the payment is in OGUN and the user doesn't have enough balance we block the transaction
    if (isPaymentOGUN && !checkBalance(OGUNBalance)) {
      return
    }
    // If the payment is in MATIC and the user doesn't have enough balance we block the transaction
    if (!isPaymentOGUN && !checkBalance(balance)) {
      return
    }

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
      })
      router.replace(router.asPath.replace('buy-now', ''))
    }

    setLoading(true)

    buyItem(
      listingPayload.buyNowItem?.buyNowItem?.tokenId,
      account,
      listingPayload.buyNowItem?.buyNowItem?.owner,
      isPaymentOGUN,
      salePrice,
      { nft: track.nftData?.contract, marketplace: listingPayload.buyNowItem.buyNowItem.contract },
    )
      .onReceipt(onReceipt)
      .onError(cause => toast.error(cause.message))
      .finally(() => setLoading(false))
      .execute(web3)
  }

  if (!isForSale || isOwner || !me || nftData?.pendingRequest != PendingRequest.None) {
    return null
  }

  const initialValues = {
    token: '',
  }

  const validationSchema = yup.object().shape({
    token: (me as any)?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  })

  return (
    <>
      <SEO
        title={`Buy now | SoundChain`}
        description={`Buy now ${track.title} - song by ${track.artist}.`}
        canonicalUrl={`/tracks/${track.id}/buy-now/`}
        image={track.artworkUrl}
      />
      <div className="flex min-h-full flex-col">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={isPaymentOGUN && !hasAllowance ? handleApproveAllowance : handleSubmit}
        >
          {({ values, handleChange, ...formikProps }) => (
            <Form autoComplete="off" className="flex flex-1 flex-col justify-between" {...(formikProps as any)}>
              <div>
                <div className="m-4">
                  <Track track={track} />
                </div>
                <div className="bg-[#112011]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="text-sm font-bold text-white">BUY NOW PRICE</div>
                    {isPaymentOGUN ? <Ogun value={priceToShow} /> : <Matic value={priceToShow} />}
                  </div>
                </div>
                {!hasStarted && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex-shrink-0 text-sm font-bold text-white">SALE STARTS</div>
                    <div className="text-md flex items-center gap-1 text-right font-bold">
                      <Timer date={new Date(startTime * 1000)} reloadOnEnd />
                    </div>
                  </div>
                )}
              </div>

              {(me as any)?.otpSecret && (
                <div className="flex items-center bg-gray-20 px-4 py-3 uppercase">
                  <p className="w-full text-xs font-bold text-gray-80">
                    <Locker className="mr-2 inline h-4 w-4" fill="#303030" /> Two-factor validation
                  </p>
                  <div className="w-1/2">
                    <InputField name="token" type="text" maxLength={6} pattern="[0-9]*" inputMode="numeric" value={values.token} onChange={handleChange} />
                  </div>
                </div>
              )}
              {priceToShow && account && (
                <BuyNow
                  price={priceToShow}
                  priceOGUN={priceToShow}
                  isPaymentOGUN={isPaymentOGUN}
                  ownerAddressAccount={account}
                  startTime={startTime}
                />
              )}
              {hasStarted && (
                <PlayerAwareBottomBar>
                  <TotalPrice price={priceToShow} isPaymentOGUN={isPaymentOGUN} />
                  {(!isPaymentOGUN || hasAllowance) && (
                    <Button type="submit" className="ml-auto" variant="buy-nft" loading={loading}>
                      <div className="px-4">CONFIRM</div>
                    </Button>
                  )}
                  {isPaymentOGUN && !hasAllowance && (
                    <Button type="submit" className="ml-auto" variant="approve-allowance" loading={loading}>
                      <div className="p-1 md:px-6">Approve Allowance for Marketplace</div>
                    </Button>
                  )}
                </PlayerAwareBottomBar>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </>
  )
}
