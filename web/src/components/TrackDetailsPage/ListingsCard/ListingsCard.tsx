import { Table, Row, Header } from 'components/common/Table'
import { TrackQuery, useBuyNowListingItemsQuery } from 'lib/graphql'
import { SaleType } from 'types/SaleType'
import { MdKeyboardArrowUp } from 'react-icons/md'
import tw from 'tailwind-styled-components'
import { isPendingRequest } from 'utils/isPendingRequest'
import { ListingItem } from './ListingsItem'
import { useEffect, useState } from 'react'
import { useModalDispatch } from 'contexts/providers/modal'
import { useIsMobile } from 'hooks/useIsMobile'
interface ListingsCardProps {
  track: TrackQuery['track']
}

export const ListingsCard = (props: ListingsCardProps) => {
  const { track } = props

  const isMobile = useIsMobile(639)

  const [numberOfPages, setNumberOfPages] = useState(5)

  const { data, loading, refetch } = useBuyNowListingItemsQuery({
    variables: {
      page: { first: numberOfPages },
      filter: { trackEdition: track.trackEditionId || '' },
    },
    pollInterval: 10000,
    fetchPolicy: 'no-cache',
    ssr: false,
  })

  const nodes = data?.buyNowListingItems.nodes
  const pageInfo = data?.buyNowListingItems.pageInfo
  const shouldDisableButton = pageInfo ? numberOfPages >= pageInfo?.totalCount : false
  const { dispatchShowRemoveListingModal } = useModalDispatch()

  const loadMore = () => {
    setNumberOfPages(prevState => prevState + 5)
  }

  useEffect(() => {
    refetch()
  }, [numberOfPages, refetch])

  const handleUnlistAll = () => {
    return dispatchShowRemoveListingModal({
      show: true,
      editionId: track.trackEdition?.editionId,
      saleType: SaleType.MARKETPLACE,
      contractAddresses: {
        nft: track.nftData?.contract,
        marketplace: track.trackEdition?.marketplace,
      },
      trackEditionId: track.trackEdition?.id,
    })
  }

  if (loading) return null

  return (
    <Container>
      <TitleContainer>
        <Title>Listed Tracks</Title>
        <MdKeyboardArrowUp size={45} color="white" />
      </TitleContainer>

      {nodes && nodes.length > 0 ? (
        <Table>
          <Row>
            {!isMobile && <Header $roundedTopLeft>ID</Header>}
            <Header $roundedTopLeft={isMobile}>PRICE</Header>
            {!isMobile && <Header>FROM</Header>}
            <Header $roundedTopRight>Action</Header>
          </Row>

          {nodes?.map((listedTrack, index) => (
            <Row key={index}>
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
                isMobile={isMobile}
              />
            </Row>
          ))}
        </Table>
      ) : (
        <Paragraph>No track listed yet</Paragraph>
      )}

      {!shouldDisableButton && <Button onClick={loadMore}>LOAD MORE</Button>}

      {nodes && nodes.length > 0 && <Button onClick={handleUnlistAll}>Unlist All</Button>}
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
  mb-10
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
