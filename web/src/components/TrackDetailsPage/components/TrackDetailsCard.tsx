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
interface Props {
  track: TrackQuery['track']
}

export const TrackDetailsCard = (props: Props) => {
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
          <Td $bgDark $roundedTopLeft>
            ARTIST ROYALTY %
          </Td>
          <Td $roundedTopRight>{royalties}</Td>
        </Row>
        <Row>
          <Td $bgDark>TRACK TITLE</Td>
          <Td>{props.track.title}</Td>
        </Row>
        <Row>
          <Td $bgDark>ALBUM TITLE</Td>
          <Td>{props.track.album || 'No album title'}</Td>
        </Row>
        <Row>
          <Td $bgDark>RELEASE YEAR</Td>
          <Td>{props.track.releaseYear}</Td>
        </Row>
        <Row>
          <Td $bgDark>GENRES</Td>
          <Td>
            {isEmptyGenre
              ? 'No Genre Selected'
              : genres.map(genre => <Badges.Badge key={genre} label={getGenreLabelByKey(genre) || genre} />)}
          </Td>
        </Row>
        <Row>
          <Td $bgDark>MINING STATUS</Td>
          <Td>{mintingPending || 'No status found'}</Td>
        </Row>
        <Row>
          <Td $bgDark>
            <Flex>
              <Pinata className="mr-2" />
              <span>Pinata IPFS</span>
            </Flex>
          </Td>
          <Td>
            <Overflow>
              <div>
                <ChainLink className="mr-2 scale-150" />
              </div>
              <AnchorTag href={`${config.ipfsGateway}${nftData?.ipfsCid}`} target="_blank" rel="noreferrer">
                {nftData?.ipfsCid || 'No Pinata IPFS Found'}
              </AnchorTag>
            </Overflow>
          </Td>
        </Row>
        <Row>
          <Td $bgDark>
            <Flex>
              <Token className="mr-2" />
              <span>Token ID</span>
            </Flex>
          </Td>
          <Td>
            <Overflow>
              <div>
                <ChainLink className="mr-2 scale-150" />
              </div>
              <AnchorTag href={`${config.polygonscan}tx/${nftData?.transactionHash}`} target="_blank" rel="noreferrer">
                {nftData?.transactionHash || 'No Transaction Found'}
              </AnchorTag>
            </Overflow>
          </Td>
        </Row>
      </Table>
    </Container>
  )
}

interface TableCellProps {
  $bgDark?: boolean
  $roundedTopRight?: boolean
  $roundedTopLeft?: boolean
  $roundedBottomRight?: boolean
  $roundedBottomLeft?: boolean
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

const Table = tw.table`
  text-white
  mt-6
  w-full
  border-collapse
`

const Row = tw.tr`
  w-full
  text-sm
  border-b-[1px]
  border-black
`

const Td = tw.td<TableCellProps>`
  ${({ $bgDark }) => ($bgDark ? 'bg-[#101010]' : 'bg-[#202020]')}

  ${({ $roundedTopRight }) => $roundedTopRight && 'rounded-tr-lg'}
  ${({ $roundedTopLeft }) => $roundedTopLeft && 'rounded-tl-lg'}
  ${({ $roundedBottomRight }) => $roundedBottomRight && 'rounded-br-lg'}
  ${({ $roundedBottomLeft }) => $roundedBottomLeft && 'rounded-bl-lg'}

  py-3
  px-6
  text-center
  w-1/2
  overflow-y-hidden
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
