import { Table, Row, Cell, Header } from 'components/common/Table'
import { TrackQuery, TrackWithListingItem, useBuyNowListingItemsQuery } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import tw from 'tailwind-styled-components'
import { isPendingRequest } from 'utils/isPendingRequest'
import { ListingItem } from './ListingsItem'
import { InfiniteLoader } from 'components/InfiniteLoader'
interface ListingsCardProps {
  track: TrackQuery['track']
}

export const ListingsCard = (props: ListingsCardProps) => {
  const { track } = props

  const {
    data,
    fetchMore,
    loading: loadingListingItem,
    refetch: refetchListingItem,
  } = useBuyNowListingItemsQuery({
    variables: {
      page: { first: 5 },
      filter: { trackEdition: track.trackEditionId || '' },
    },
    ssr: false,
  })

  const nodes = data?.buyNowListingItems.nodes
  const pageInfo = data?.buyNowListingItems.pageInfo

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: 5,
          after: pageInfo?.endCursor,
        },
      },
    })
  }

  return (
    <Container>
      <TitleContainer>
        <Title>Listings</Title>
        <MdKeyboardArrowUp size={45} color="white" />
      </TitleContainer>

      <Table>
        <Row>
          <Header $roundedTopLeft>ID</Header>
          <Header>PRICE</Header>
          <Header>FROM</Header>
          <Header $roundedTopRight>Action</Header>
        </Row>

        {nodes?.map(listedTrack => (
          <Row key={listedTrack.id}>
            <ListingItem
              key={listedTrack.id}
              price={listedTrack.listingItem?.pricePerItemToShow || 0}
              priceOGUN={listedTrack.listingItem?.OGUNPricePerItemToShow || 0}
              isPaymentOGUN={
                listedTrack.listingItem?.OGUNPricePerItemToShow
                  ? Boolean(listedTrack.listingItem?.OGUNPricePerItemToShow !== 0)
                  : false
              }
              profileId={listedTrack.profileId || ''}
              trackId={listedTrack.id}
              tokenId={listedTrack.nftData?.tokenId || 0}
              contractAddress={listedTrack.nftData?.contract || ''}
              isProcessing={
                isPendingRequest(listedTrack.nftData?.pendingRequest) ||
                isPendingRequest(listedTrack.trackEdition?.editionData?.pendingRequest)
              }
            />
          </Row>
        ))}
      </Table>
    </Container>
  )
}

const Container = tw.div`
  min-w-[320px] 
  max-w-[350px]
  rounded-xl 
  bg-[#19191A] 
  p-6
  w-full
  sm:max-w-[800px]
`
const TitleContainer = tw.div`
  flex 
  items-center 
  justify-between
  w-full
`

const Title = tw.h3`
  text-xl 
  font-bold 
  text-white
`
