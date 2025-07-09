import { BackButton } from 'components/common/Buttons/BackButton'
import { ListNFTBuyNow, ListNFTBuyNowFormValues } from 'components/pages/details-NFT/ListNFTBuyNow'
import { TopNavBarProps } from 'components/TopNavBar'
import { Track } from 'components/Track'
import { useModalDispatch, useModalState } from 'contexts/providers/modal'
import { FormikHelpers } from 'formik'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2, { ListBatchParams } from 'hooks/useBlockchainV2'
import { useEditionOwner } from 'hooks/useEditionOwner'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMaxBatchListGasFee } from 'hooks/useMaxBatchListGasFee'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { cacheFor } from 'lib/apollo'
import {
  PendingRequest,
  TrackDocument,
  TrackQuery,
  useListableOwnedTrackIdsQuery,
  useUpdateAllOwnedTracksMutation,
} from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { SaleType } from 'types/SaleType'
import SEO from '../../../../components/SEO'

const LIST_BATCH_SIZE = 120
export interface TrackPageProps {
  track: TrackQuery['track']
}

interface TrackPageParams extends ParsedUrlQuery {
  id: string
}

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'List for Sale',
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

  return cacheFor(ListBuyNowPage, { track: data.track }, context, apolloClient)
})

export default function ListBuyNowPage({ track }: TrackPageProps) {
  const { isApprovedMarketplace: checkIsApproved } = useBlockchain()
  const { listBatch } = useBlockchainV2()
  const router = useRouter()
  const me = useMe()
  const [ownedTracksUpdate] = useUpdateAllOwnedTracksMutation()
  const { account, web3 } = useWalletContext()
  const { showApprove } = useModalState()
  const { dispatchShowApproveModal } = useModalDispatch()
  const [isApproved, setIsApproved] = useState(false)
  const { setTopNavBarProps } = useLayoutContext()
  const { isOwner } = useEditionOwner(track.trackEdition?.editionId)

  const nftData = track.nftData
  const editionData = track.trackEdition?.editionData
  const canList = (me?.profile.verified && nftData?.minter === account) || nftData?.minter != account

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  useEffect(() => {
    const fetchIsApproved = async () => {
      if (!web3 || !checkIsApproved || !account) return

      const is = await checkIsApproved(web3, account, { nft: nftData?.contract })
      setIsApproved(is)
    }
    fetchIsApproved()
  }, [account, web3, checkIsApproved, showApprove, nftData])

  const isForSale = track.trackEdition?.listed

  const { data: ownedTrackIds } = useListableOwnedTrackIdsQuery({
    variables: {
      filter: {
        trackEditionId: track.trackEdition!.id,
        owner: account!,
      },
    },
    skip: !account || !track.trackEdition?.id,
  })
  const allTracks = ownedTrackIds?.listableOwnedTracks?.nodes.filter(
    track => track.nftData?.tokenId !== null && track.nftData?.tokenId !== undefined,
  )

  const maxBatchListGasFee = useMaxBatchListGasFee(allTracks?.length ?? 0)

  const handleListEdition = async (
    { salePrice, selectedCurrency, startTime }: ListNFTBuyNowFormValues,
    helper: FormikHelpers<ListNFTBuyNowFormValues>,
  ) => {
    if (
      nftData?.tokenId === null ||
      nftData?.tokenId === undefined ||
      !account ||
      !web3 ||
      !track.trackEdition ||
      !allTracks
    ) {
      return
    }
    const weiPrice = web3?.utils.toWei(salePrice.toString(), 'ether') || '0'
    const startTimestamp = Math.ceil(startTime.getTime() / 1000)

    function listIds(trackIds: string[], params: ListBatchParams) {
      return new Promise<void>((resolve, reject) => {
        const onReceipt = async () => {
          await ownedTracksUpdate({
            variables: {
              input: {
                trackIds,
                trackEditionId: track.trackEdition!.id,
                owner: params.from,
                nftData: {
                  pendingRequest: PendingRequest.List,
                  pendingTime: new Date().toISOString(),
                },
              },
            },
          })
          resolve()
        }
        listBatch(params)
          .onReceipt(onReceipt)
          .onError(cause => {
            toast.error(cause.message)
            reject(cause)
          })
          .execute(web3!)
      })
    }

    let nonce = await web3?.eth.getTransactionCount(account)
    const promises = []
    while (allTracks.length > 0) {
      const tracksToList = allTracks.splice(0, LIST_BATCH_SIZE)
      console.log(`Listing ${tracksToList.length} tracks`)
      promises.push(
        listIds(
          tracksToList.map(track => track.id),
          {
            tokenIds: tracksToList.map(t => Number(t.nftData!.tokenId)),
            from: account,
            price: (selectedCurrency === 'MATIC' && weiPrice) || '0',
            priceOGUN: (selectedCurrency === 'OGUN' && weiPrice) || '0',
            startTime: startTimestamp,
            contractAddresses: { nft: nftData.contract },
            nonce: Number(nonce++), // Converted bigint to number
          },
        ),
      )
    }

    await Promise.all(promises)
    helper.setSubmitting(false)
    router.replace(router.asPath.replace('/list/buy-now-edition', ''))
  }

  const handleList = (values: ListNFTBuyNowFormValues, helper: FormikHelpers<ListNFTBuyNowFormValues>) => {
    if (nftData?.tokenId === null || nftData?.tokenId === undefined || !account || !web3) {
      return
    }
    if (isApproved) {
      handleListEdition(values, helper)
    } else {
      me ? dispatchShowApproveModal(true, SaleType.MARKETPLACE, nftData.contract) : router.push('/login')
      helper.setSubmitting(false)
    }
  }

  if (!isOwner || isForSale || editionData?.pendingRequest != PendingRequest.None || !canList) {
    return null
  }

  return (
    <>
      <SEO
        title={`List track | SoundChain`}
        description={'List your track as a buy now item on SoundChain'}
        canonicalUrl={router.asPath}
      />
      <div className="m-4">
        <Track track={track} />
      </div>
      <ListNFTBuyNow
        handleSubmit={handleList}
        submitLabel={isApproved ? 'LIST EDITION' : 'APPROVE MARKETPLACE'}
        maxGasFee={maxBatchListGasFee}
      />
    </>
  )
}
