import { Accordion, Badges, Cell, Row, Table } from 'components/common'
import { config } from 'config'
import useBlockchain from 'hooks/useBlockchain'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useWalletContext } from 'hooks/useWalletContext'
import { ChainLink } from 'icons/ChainLink'
import { Pinata } from 'icons/Pinata'
import { Token } from 'icons/Token'
import { PendingRequest, TrackQuery } from 'lib/graphql'
import { useEffect, useState } from 'react'
import { BsQuestionCircleFill } from 'react-icons/bs'
import ReactTooltip from 'react-tooltip'
import tw from 'tailwind-styled-components'
import { getGenreLabelByKey } from 'utils/Genres'

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

  const [royalties, setRoyalties] = useState<number | string>('No Royalties found')

  const isProcessing = nftData?.pendingRequest != PendingRequest.None
  const tokenId = nftData?.tokenId
  const genres = props?.track?.genres || []
  const isEmptyGenre = genres.length <= 0

  useEffect(() => {
    const fetchRoyalties = async () => {
      if (!account || !web3 || !tokenId || !trackEdition?.editionId || isProcessing) {
        setRoyalties('No Royalties found')
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
          <Cell $roundedTopRight>{royalties}%</Cell>
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
            {isEmptyGenre ? (
              <div>No Genre Selected</div>
            ) : (
              <Overflow>
                {genres.map(genre => (
                  <Badges.Badge key={genre} label={getGenreLabelByKey(genre) || genre} className="mr-4" />
                ))}
              </Overflow>
            )}
          </Cell>
        </Row>
        <Row>
          <Cell $bgDark>MINING STATUS</Cell>
          <Cell $displayFlex>
            {nftData?.pendingRequest || 'No minting status found'}
            {nftData?.pendingRequest !== PendingRequest.None && (
              <>
                <ProcessingContainer>
                  <ReactTooltip id="processingEdition" type="dark" effect="solid">
                    <span>Your NFT is being processed. This can take several minutes.</span>
                  </ReactTooltip>
                  <BsQuestionCircleFill data-tip data-for="processingEdition" size={18} />
                </ProcessingContainer>
              </>
            )}
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
    </Accordion>
  )
}

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

const ProcessingContainer = tw.div`
  flex
  items-center
  justify-center
  gap-4
  text-neutral-400
  ml-2
`
