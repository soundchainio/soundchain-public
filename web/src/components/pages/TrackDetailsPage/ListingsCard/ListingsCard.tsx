import { Table, Row, Header } from 'components/common/Table'
import { TrackQuery, useBuyNowListingItemsQuery } from 'lib/graphql'
import { SaleType } from 'lib/graphql'
import tw from 'tailwind-styled-components'
import { ListingItem } from './ListingsItem'
import { useModalDispatch } from 'contexts/ModalContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { Accordion } from 'components/common'
interface ListingsCardProps {
  track: TrackQuery['track']
  isOwner: boolean
}

const pageSize = 5

export const ListingsCard = (props: ListingsCardProps) => {
  const { track, isOwner } = props

  const isMobile = useIsMobile(639)

  const { data, loading, fetchMore } = useBuyNowListingItemsQuery({
    variables: {
      page: { first: pageSize },
      filter: { trackEdition: track.trackEditionId as string },
    },
    skip: !track.trackEditionId,
    pollInterval: 10000,
    ssr: false,
  })

  const nodes = data?.buyNowListingItems.nodes
  const pageInfo = data?.buyNowListingItems.pageInfo
  const shouldShowLoadMoreButton = pageInfo ? data?.buyNowListingItems.nodes.length >= pageInfo?.totalCount : false

  const { dispatchShowRemoveListingModal } = useModalDispatch()

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo?.endCursor,
        },
        filter: {
          trackEdition: track.trackEditionId as string,
        },
      },
    })
  }

  const handleUnlistAll = () => {
    return dispatchShowRemoveListingModal({
      show: true,
      editionId: track.trackEdition?.editionId,
      saleType: SaleType.BuyNow,
      contractAddresses: {
        nft: track.nftData?.contract,
        marketplace: track.trackEdition?.marketplace,
      },
      trackEditionId: track.trackEdition?.id,
    })
  }

  if (loading || !nodes || nodes.length <= 0) return null

  return (
    <Accordion title="Listed Tracks">
      {nodes && nodes.length > 0 ? (
        <Table>
          <Row>
            <Header $roundedTopLeft>ID</Header>
            <Header>PRICE</Header>
            {!isMobile && <Header>FROM</Header>}
            <Header $roundedTopRight>Action</Header>
          </Row>

          {nodes?.map((listedTrack, index) => (
            <Row key={index}>
              <ListingItem listedTrack={listedTrack} key={listedTrack.id} isMobile={isMobile} />
            </Row>
          ))}
        </Table>
      ) : (
        <Paragraph>No track listed yet</Paragraph>
      )}

      {!shouldShowLoadMoreButton && <Button onClick={loadMore}>LOAD MORE</Button>}

      {isOwner && nodes && nodes.length > 0 && <Button onClick={handleUnlistAll}>Unlist All</Button>}
    </Accordion>
  )
}

const Paragraph = tw.p`
  text-lg
  text-neutral-400
  flex
  items-center
  justify-center
`

const Button = tw.button`
  text-sm 
  font-bold 
  leading-6 
  tracking-wide
  text-white
  w-full
  mt-6

  hover:text-blue-300
`
