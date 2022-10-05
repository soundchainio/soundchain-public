import tw from 'tailwind-styled-components'
import Link from 'next/link'
import { Table, Row, Cell, Header } from 'components/common/Table'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { TrackQuery, useOwnedTracksQuery } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import { isPendingRequest } from 'utils/isPendingRequest'
import { Button } from 'components/Buttons/Button'
import { OwnedEditionItem } from './OwnedEditionItem'
import { useRouter } from 'next/router'

interface OwnedEditionListCardProps {
  track: TrackQuery['track']
}

export const OwnedEditionListCard = (props: OwnedEditionListCardProps) => {
  const { track } = props

  const router = useRouter()
  const me = useMe()
  const { account } = useWalletContext()

  const isMinter = track.nftData?.minter === account
  const canList = (me?.profile.verified && isMinter) || track.nftData?.minter != account

  const numberOfItemsPerPage = 5

  const isProcessing = (ownedTrack: TrackQuery['track']) => {
    return (
      isPendingRequest(ownedTrack.nftData?.pendingRequest) ||
      isPendingRequest(ownedTrack.trackEdition?.editionData?.pendingRequest)
    )
  }

  const { data: ownedTracksData, loading: isLoading } = useOwnedTracksQuery({
    variables: {
      page: { first: numberOfItemsPerPage },
      filter: {
        trackEditionId: track.trackEditionId as string,
        owner: account as string,
      },
    },
    skip: !track.trackEditionId || !account,
    ssr: false,
  })

  const ownedTracks = ownedTracksData?.ownedTracks.nodes

  if (isLoading || !ownedTracks?.length) return null

  return (
    <Container>
      <TitleContainer>
        <Title>
          Owned Editions <span className="text-md font-thin text-neutral-400 ">({ownedTracks[0].editionSize})</span>
        </Title>
        <MdKeyboardArrowUp size={45} color="white" />
      </TitleContainer>

      {canList ? (
        <Table>
          <Row>
            <Header $roundedTopLeft>ID</Header>
            <Header>STATUS</Header>
            <Header $roundedTopRight>Actions</Header>
          </Row>
          {ownedTracks.map(ownedTrack => {
            if (ownedTrack.trackEdition?.listed) return null

            return (
              <Row key={ownedTrack.id}>
                <Cell>#{ownedTrack.trackEdition?.editionId}</Cell>

                <Cell>
                  {ownedTrack.listingItem ? (
                    <Status $isListed={Boolean(ownedTrack.listingItem)}>listed</Status>
                  ) : (
                    <Status $isListed={Boolean(ownedTrack.listingItem)}>unlisted</Status>
                  )}
                </Cell>

                <Cell>
                  <OwnedEditionItem
                    key={ownedTrack.id}
                    trackId={ownedTrack.id}
                    tokenId={ownedTrack.nftData?.tokenId || 0}
                    contractAddress={ownedTrack.nftData?.contract || ''}
                    isListed={ownedTrack.listingItem}
                    isProcessing={isProcessing(ownedTrack)}
                  />
                </Cell>
              </Row>
            )
          })}
        </Table>
      ) : (
        <>
          <Paragraph>You must be verified in order to sell NFT’s.</Paragraph>
          <Link href={`/get-verified`}>
            <a>
              <Button variant="list-nft">
                <ButtonTitle>GET VERIFIED</ButtonTitle>
              </Button>
            </a>
          </Link>
        </>
      )}

      <div className="mt-6 flex w-full items-center justify-center">
        <Link href={`${router.query.id}/list/buy-now-edition`}>
          <a>
            <ButtonTitle>LIST ALL</ButtonTitle>
          </a>
        </Link>
      </div>
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
const Paragraph = tw.p`
  my-4
  text-md
  font-bold
  text-white
  text-center
`
const ButtonTitle = tw.span`
  text-sm 
  font-bold 
  leading-6 
  tracking-wide
  text-white

  hover:text-blue-300
`
const Status = tw.span<{ $isListed: boolean }>`
  ${({ $isListed }) => ($isListed ? 'text-white' : 'text-neutral-400')}
  
  leading-6 
  tracking-wide
  text-sm
`
