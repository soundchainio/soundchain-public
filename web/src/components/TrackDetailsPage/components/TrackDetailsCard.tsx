import useBlockchain from 'hooks/useBlockchain'
import { useWalletContext } from 'hooks/useWalletContext'
import { TrackQuery, PendingRequest } from 'lib/graphql'
import { MdKeyboardArrowUp } from 'react-icons/md'
import { useState, useEffect } from 'react'
import { config } from 'config'
import { Pinata } from 'icons/Pinata'
import { Token } from 'icons/Token'

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
    <div className="w-full rounded-xl bg-[#19191A] p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Track Details</h3>
        <MdKeyboardArrowUp size={45} color="white" />
      </div>

      <table className="text-white">
        <tr className="flex items-start">
          <td className="bg-[#101010] text-center">ARTIST ROYALTY %</td>
          <td className="bg-[#202020] text-center">{royalties}</td>
        </tr>
      </table>

      {/* <div className="my-6 flex w-full flex-col gap-[2px]">
        <div className="flex items-center justify-start">
          <h4 className="w-[50%] rounded-tl-lg bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">
            ARTIST ROYALTY %
          </h4>
          <span className="flex w-[50%] items-center justify-center rounded-tr-lg bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {royalties}
          </span>
        </div>

        <div className="flex w-full items-center justify-start">
          <h4 className="w-[50%] bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">TRACK TITLE</h4>
          <span className="flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {props.track.title}
          </span>
        </div>

        <div className="flex w-full items-center justify-start">
          <h4 className="w-[50%] bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">ALBUM TITLE</h4>
          <span className="flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {props.track.album || 'No album title'}
          </span>
        </div>

        <div className="flex w-full items-center justify-start">
          <h4 className="w-[50%] bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">RELEASE YEAR</h4>
          <span className="flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {props.track.releaseYear || 'No album title'}
          </span>
        </div>

        <div className="flex w-full items-center justify-start">
          <h4 className="w-[50%] bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">RELEASE YEAR</h4>
          <span className="wrap flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {genres.length > 0
              ? genres?.map((genre, index) => (
                  <div key={index} className="flex items-center justify-center bg-[#101010] py-2 px-4">
                    {genre}
                  </div>
                ))
              : 'No Genre selected'}
          </span>
        </div>

        <div className="flex h-full w-full items-center justify-start">
          <h4 className="w-[50%] bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">MINTING STATUS</h4>
          <span className="flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold not-italic leading-4 text-white">
            {mintingPending || 'No status found'}
          </span>
        </div>

        <div className="flex h-full w-full items-center justify-start">
          <h4 className="flex w-[50%] items-center bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">
            <Pinata className="mr-2" />
            Pinata IPFS
          </h4>
          <div className="flex w-[50%] items-center justify-center bg-[#202020] p-6 text-xs font-bold leading-4 text-[#7D7F80]">
            <a
              href={`${config.ipfsGateway}${nftData?.ipfsCid}`}
              target="_blank"
              className="overflow-hidden overflow-ellipsis text-sm text-xxs text-gray-80"
              rel="noreferrer"
            >
              {nftData?.ipfsCid || 'No Pinata IPFS found'}
            </a>
          </div>
        </div>

        <div className="flex h-full w-full items-center justify-start">
          <h4 className="flex w-[50%] items-center rounded-bl-lg bg-[#101010] p-6 text-xs font-bold not-italic leading-4 text-white">
            <Token className="mr-2" />
            Token ID
          </h4>
          <div className="flex w-[50%] items-center justify-center rounded-br-lg bg-[#202020] p-6 text-xs font-bold leading-4 text-[#7D7F80]">
            <a
              href={`${config.polygonscan}tx/${nftData?.transactionHash}`}
              target="_blank"
              className="overflow-hidden overflow-ellipsis text-sm text-xxs text-gray-80"
              rel="noreferrer"
            >
              {nftData?.ipfsCid || 'No transaction found'}
            </a>
          </div>
        </div>
      </div> */}
    </div>
  )
}
