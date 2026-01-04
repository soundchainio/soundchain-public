import { useMemo } from 'react'

import { Accordion, Cell, Header, Row, Table } from 'components/common'
import { Button } from 'components/common/Buttons/Button'
import { SpinAnimation } from 'components/common/SpinAnimation'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { config } from 'config'
import { useMe } from 'hooks/useMe'
import useMetaMask from 'hooks/useMetaMask'
import { useWalletContext } from 'hooks/useWalletContext'
import { Profile, TrackQuery, TrackWithListingItem, useOwnedTracksQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import tw from 'tailwind-styled-components'

import { OwnedEditionItem } from './OwnedEditionItem'

interface OwnedEditionListCardProps {
  track: TrackQuery['track']
}

const pageSize = 30

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
    pollInterval: 30000, // 30s instead of 10s for battery efficiency
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
    <Link href="/login" className="mx-[2px] hover:text-white" passHref>
      <strong>Soundchain</strong>
    </Link>
  )

  const MetaMaskLink = () => (
    <strong onClick={connect} className="mx-[2px] hover:cursor-pointer hover:text-white">
      MetaMask
    </strong>
  )

  return (
    <Accordion title="Owned Tracks">
      {!account && !loading && (
        <Paragraph>
          Create a <SoundchainLoginLink /> account or connect your <MetaMaskLink /> wallet.
        </Paragraph>
      )}

      {canList && (
        <Table>
          <Row>
            <Header $roundedTopLeft>Token ID</Header>
            <Header>Owner</Header>
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
                  <div className="flex items-center justify-center">
                    <ProfileWithAvatar profile={me?.profile as Partial<Profile>} avatarSize={35} />
                  </div>
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
          <Link href={`/get-verified`} passHref>
            <Button variant="list-nft">
              <ButtonTitle>GET VERIFIED</ButtonTitle>
            </Button>
          </Link>
        </>
      )}

      {canList && (
        <CanListContainer>
          <Link href={`${router.query.id}/list/buy-now-edition`} passHref>
            <ButtonTitle>LIST ALL</ButtonTitle>
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
