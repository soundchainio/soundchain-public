import tw from 'tailwind-styled-components'
import Link from 'next/link'
import { Table, Row, Cell, Header, Accordion } from 'components/common'
import { useMe } from 'hooks/useMe'
import { useWalletContext } from 'hooks/useWalletContext'
import { TrackQuery, TrackWithListingItem, useOwnedTracksQuery } from 'lib/graphql'
import { Button } from 'components/Buttons/Button'
import { OwnedEditionItem } from './OwnedEditionItem'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import useMetaMask from 'hooks/useMetaMask'
import { SpinAnimation } from 'components/common/SpinAnimation'
import { config } from 'config'
interface OwnedEditionListCardProps {
  track: TrackQuery['track']
}

const pageSize = 5

export const OwnedEditionListCard = (props: OwnedEditionListCardProps) => {
  const { track } = props

  const router = useRouter()
  const me = useMe()
  const { account } = useWalletContext()
  const { connect } = useMetaMask()

  const { data, loading, fetchMore } = useOwnedTracksQuery({
    variables: {
      page: { first: pageSize },
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
  const shouldShowLoadMoreButton = pageInfo ? data?.ownedTracks?.nodes?.length >= pageInfo?.totalCount : false

  const ownedTracks = useMemo(() => {
    if (!nodes) return

    const array = nodes.map(track => {
      if (track.listingItem) return null

      return track
    })

    return array.filter(Boolean)
  }, [nodes])

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo?.endCursor,
        },
        filter: {
          trackEditionId: track.trackEditionId as string,
          owner: account as string,
        },
      },
    })
  }

  if (loading) return <SpinAnimation />
  if (!ownedTracks || ownedTracks.length <= 0) return null

  const SoundchainLoginLink = () => (
    <Link href="/login">
      <a className="mx-[2px] hover:text-white">
        <strong>Soundchain</strong>
      </a>
    </Link>
  )

  const MetaMaskLink = () => (
    <strong onClick={connect} className="mx-[2px] hover:cursor-pointer hover:text-white">
      MetaMask
    </strong>
  )

  return (
    <Accordion title="Unlisted Tracks">
      {!account && !loading && (
        <Paragraph>
          Create a <SoundchainLoginLink /> account or connect your <MetaMaskLink /> wallet.
        </Paragraph>
      )}

      {canList && (
        <Table>
          <Row>
            <Header $roundedTopLeft>Token ID</Header>
            <Header $roundedTopRight>Actions</Header>
          </Row>

          {ownedTracks.map(ownedTrack => {
            if (!ownedTrack) return

            return (
              <Row key={ownedTrack.id}>
                <Cell>
                  <AnchorTag
                    href={`${config.polygonscan}address/${ownedTrack.nftData?.contract}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #{ownedTrack.nftData?.tokenId}
                  </AnchorTag>
                </Cell>
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
        <CanListContainer>
          <Link href={`${router.query.id}/list/buy-now-edition`}>
            <a>
              <ButtonTitle>LIST ALL</ButtonTitle>
            </a>
          </Link>
        </CanListContainer>
      )}

      {!shouldShowLoadMoreButton && <LoadMoreButton onClick={loadMore}>LOAD MORE</LoadMoreButton>}
    </Accordion>
  )
}

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
const CanListContainer = tw.div`
  mt-6 
  flex
  w-full 
  items-center 
  justify-center
`

const AnchorTag = tw.a`
  text-sm
  text-blue-300
  break-words
  font-medium
  
  hover:text-white
`
