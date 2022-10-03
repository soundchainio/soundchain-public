import useBlockchain from 'hooks/useBlockchain'
import { useWalletContext } from 'hooks/useWalletContext'
import { TrackQuery, PendingRequest } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import { useState, useEffect } from 'react'
import { config } from 'config'
import { Pinata } from 'icons/Pinata'
import { Token } from 'icons/Token'
import tw from 'tailwind-styled-components'
import { ChainLink } from 'icons/ChainLink'
import { Badges } from 'components/common'
import { getGenreLabelByKey } from 'utils/Genres'
import { Table, Row, Cell } from 'components/common/Table'

interface TrackDetailsCardProps {
  track: TrackQuery['track']
}

export const TrackDetailsCard = (props: TrackDetailsCardProps) => {
  const {
    track: { trackEdition, nftData },
  } = props

  const { getRoyalties } = useBlockchain()
  const { account, web3 } = useWalletContext()

  const [royalties, setRoyalties] = useState<number | string>('No Royalties found')

  const isProcessing = nftData?.pendingRequest != PendingRequest.None
  const tokenId = nftData?.tokenId
  const mintingPending = nftData?.pendingRequest === PendingRequest.Mint
  const genres = props?.track?.genres || []
  const isEmptyGenre = genres.length <= 0

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || !tokenId || !trackEdition?.editionId || isProcessing) {
        setRoyalties('No Royalties found')
        return
      }

      const royaltiesFromBlockchain = await getRoyalties(web3, tokenId, { nft: nftData?.contract })

      setRoyalties(royaltiesFromBlockchain)
    }
    fetchRoyalties()
  }, [account, web3, tokenId, getRoyalties, royalties, trackEdition?.editionId, isProcessing, nftData?.contract])

  if (!props.track) return null

  return (
    <Container>
      <TitleContainer>
        <Title>Track Details</Title>
        <MdKeyboardArrowUp size={45} color="white" />
      </TitleContainer>

      <Table>
        <Row>
          <Cell $bgDark $roundedTopLeft>
            ARTIST ROYALTY %
          </Cell>
          <Cell $roundedTopRight>{royalties}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>TRACK TITLE</Cell>
          <Cell>{props.track.title}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>ALBUM TITLE</Cell>
          <Cell>{props.track.album || 'No album title'}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>RELEASE YEAR</Cell>
          <Cell>{props.track.releaseYear}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>GENRES</Cell>
          <Cell>
            {isEmptyGenre
              ? 'No Genre Selected'
              : genres.map(genre => <Badges.Badge key={genre} label={getGenreLabelByKey(genre) || genre} />)}
          </Cell>
        </Row>
        <Row>
          <Cell $bgDark>MINING STATUS</Cell>
          <Cell>{mintingPending || 'No status found'}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>
            <Flex>
              <Pinata className="mr-2" />
              <span>Pinata IPFS</span>
            </Flex>
          </Cell>
          <Cell>
            <Overflow>
              <div>
                <ChainLink className="mr-2 scale-150" />
              </div>
              <AnchorTag href={`${config.ipfsGateway}${nftData?.ipfsCid}`} target="_blank" rel="noreferrer">
                {nftData?.ipfsCid || 'No Pinata IPFS Found'}
              </AnchorTag>
            </Overflow>
          </Cell>
        </Row>
        <Row>
          <Cell $bgDark>
            <Flex>
              <Token className="mr-2" />
              <span>Token ID</span>
            </Flex>
          </Cell>
          <Cell>
            <Overflow>
              <div>
                <ChainLink className="mr-2 scale-150" />
              </div>
              <AnchorTag href={`${config.polygonscan}tx/${nftData?.transactionHash}`} target="_blank" rel="noreferrer">
                {nftData?.transactionHash || 'No Transaction Found'}
              </AnchorTag>
            </Overflow>
          </Cell>
        </Row>
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

const Overflow = tw.div`
  flex
  items-center
  w-[100px]
  break-words
`

const AnchorTag = tw.a`
  text-sm
  text-gray-80
  break-words
  hover:text-white
`

const Flex = tw.div`
  flex
  items-center
  justify-center
`
