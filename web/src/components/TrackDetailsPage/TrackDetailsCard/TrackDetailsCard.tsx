import { Accordion, Badges, Cell, Row, Table } from 'components/common'
import { config } from 'config'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { Pinata } from 'icons/Pinata'
import { Token } from 'icons/Token'
import { PendingRequest, TrackQuery } from 'lib/graphql'
import { useEffect, useState } from 'react'
import tw from 'tailwind-styled-components'
import { getGenreLabelByKey } from 'utils/Genres'
import { BiLinkExternal } from 'react-icons/bi'
interface TrackDetailsCardProps {
  track: TrackQuery['track']
}

export const TrackDetailsCard = (props: TrackDetailsCardProps) => {
  const {
    track: { trackEdition, nftData },
  } = props

  const { getRoyalties } = useBlockchain()
  const { getEditionRoyalties } = useBlockchainV2()
  const { account, web3 } = useWalletContext()

  const [royalties, setRoyalties] = useState(0)

  const isProcessing = nftData?.pendingRequest != PendingRequest.None
  const tokenId = nftData?.tokenId
  const genres = props?.track?.genres || []
  const isEmptyGenre = genres.length <= 0

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || !tokenId || !trackEdition?.editionId || isProcessing) {
        return
      }

      const editionRoyalties = await getEditionRoyalties(web3, trackEdition.editionId)
      const trackRoyalties = await getRoyalties(web3, tokenId, { nft: nftData?.contract })

      setRoyalties(editionRoyalties || trackRoyalties)
    }
    fetchRoyalties()
  }, [
    account,
    web3,
    tokenId,
    getRoyalties,
    royalties,
    trackEdition?.editionId,
    isProcessing,
    nftData?.contract,
    getEditionRoyalties,
  ])

  if (!props.track) return null

  return (
    <Accordion title="Track Details">
      <Table>
        <Row>
          <Cell $bgDark $roundedTopLeft>
            ARTIST ROYALTY %
          </Cell>
          <Cell $roundedTopRight>{royalties ? `${royalties}%` : 'No Royalties found'}</Cell>
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
          <Cell $bgDark>COPYRIGHT</Cell>
          <Cell>{props.track.copyright || 'No Copyright'}</Cell>
        </Row>
        <Row>
          <Cell $bgDark>GENRES</Cell>
          <Cell>
            <Overflow>
              {isEmptyGenre ? (
                <div>No Genre Selected</div>
              ) : (
                <>
                  {genres.map(genre => (
                    <Badges.Badge key={genre} label={getGenreLabelByKey(genre) || genre} className="mr-4" />
                  ))}
                </>
              )}
            </Overflow>
          </Cell>
        </Row>
        <Row>
          <Cell $bgDark>
            <Flex>
              <Pinata className="mr-2" />
              <span>Pinata IPFS</span>
            </Flex>
          </Cell>
          <Cell>
            {nftData?.ipfsCid ? (
              <AnchorTag href={`${config.ipfsGateway}${nftData?.ipfsCid}`} target="_blank" rel="noreferrer">
                <span>Pinata</span>
                <BiLinkExternal size={20} color="#7D7F80" />
              </AnchorTag>
            ) : (
              'No Pinata IPFS Found'
            )}
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
            {nftData?.transactionHash ? (
              <AnchorTag href={`${config.polygonscan}tx/${nftData?.transactionHash}`} target="_blank" rel="noreferrer">
                <span>Blockchain</span>
                <BiLinkExternal size={20} color="#7D7F80" />
              </AnchorTag>
            ) : (
              'No Transaction Found'
            )}
          </Cell>
        </Row>
      </Table>
    </Accordion>
  )
}

const Overflow = tw.div`
  flex
  items-center
  w-[100px]
`

const AnchorTag = tw.a`
  text-sm
  text-white
  break-words
  flex
  items-center
  justify-center
  gap-1
  w-full

  sm:gap-2
  
  hover:text-gray-80
`

const Flex = tw.div`
  flex
  items-center
  justify-center
`
