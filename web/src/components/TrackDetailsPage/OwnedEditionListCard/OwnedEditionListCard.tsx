import tw from 'tailwind-styled-components'
import Link from 'next/link'
import { Table, Row, Cell, Header } from 'components/common/Table'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { TrackQuery, TrackWithListingItem, useOwnedTracksQuery } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import { Button } from 'components/Buttons/Button'
import { OwnedEditionItem } from './OwnedEditionItem'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

interface OwnedEditionListCardProps {
  track: TrackQuery['track']
}

export const OwnedEditionListCard = (props: OwnedEditionListCardProps) => {
  const { track } = props

  const [numberOfPages, setNumberOfPages] = useState(5)

  const router = useRouter()
  const me = useMe()
  const { account } = useWalletContext()

  const { data, loading, refetch } = useOwnedTracksQuery({
    variables: {
      page: { first: numberOfPages },
      filter: {
        trackEditionId: track.trackEditionId as string,
        owner: account as string,
      },
    },
    skip: !track.trackEditionId || !account,
    pollInterval: 10000,
    ssr: false,
  })

  const isMinter = track.nftData?.minter === account
  const canList = (me?.profile.verified && isMinter) || track.nftData?.minter != account
  const nodes = data?.ownedTracks.nodes as TrackWithListingItem[]
  const pageInfo = data?.ownedTracks.pageInfo
  const shouldDisableButton = pageInfo ? numberOfPages >= pageInfo?.totalCount : false

  const ownedTracks = useMemo(() => {
    if (!nodes) return

    const array = nodes.map(track => {
      if (track.listingItem) return null

      return track
    })

    return array.filter(Boolean)
  }, [nodes])

  const loadMore = () => {
    setNumberOfPages(prevState => prevState + 5)
  }

  useEffect(() => {
    refetch()
  }, [numberOfPages, refetch])

  if (loading || !ownedTracks || ownedTracks.length <= 0) return null

  return (
    <Container>
      <TitleContainer>
        <Title>
          Unlisted Tracks
          <span className="text-md font-thin text-neutral-400 ">{ownedTracks && ` (${ownedTracks.length})`}</span>
        </Title>
        <MdKeyboardArrowUp size={45} color="white" />
      </TitleContainer>

      {!account && (
        <Paragraph>
          Log in to your Metamask or Soundchain
          <br />
          account to see your editions.
        </Paragraph>
      )}

      {canList && (
        <Table>
          <Row>
            <Header $roundedTopLeft>ID</Header>
            <Header $roundedTopRight>Actions</Header>
          </Row>

          {ownedTracks.map(ownedTrack => {
            if (!ownedTrack) return

            return (
              <Row key={ownedTrack.id}>
                <Cell>#{ownedTrack.trackEdition?.editionId}</Cell>
                <Cell>
                  <OwnedEditionItem key={ownedTrack.id} ownedTrack={ownedTrack} />
                </Cell>
              </Row>
            )
          })}
        </Table>
      )}

      {!canList && (
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

      {canList && (
        <div className="mt-6 flex w-full items-center justify-center">
          <Link href={`${router.query.id}/list/buy-now-edition`}>
            <a>
              <ButtonTitle>LIST ALL</ButtonTitle>
            </a>
          </Link>
        </div>
      )}

      <LoadMoreButton onClick={loadMore} disabled={shouldDisableButton}>
        LOAD MORE
      </LoadMoreButton>
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
  text-lg
  text-neutral-400
  flex
  items-center
  justify-center
  my-4
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
const LoadMoreButton = tw.button`
  text-sm 
  font-bold 
  leading-6 
  tracking-wide
  text-white
  w-full
  mt-6

  hover:text-blue-300
`
