/* eslint-disable @next/next/link-passhref */
import { useTokenOwner } from 'hooks/useTokenOwner'
import { Role, TrackWithListingItem } from 'lib/graphql'
import { SpinAnimation } from 'components/common/SpinAnimation'
import { BsQuestionCircleFill } from 'react-icons/bs'
import ReactTooltip from 'react-tooltip'
import Link from 'next/link'
import tw from 'tailwind-styled-components'
import { BsTagFill } from 'react-icons/bs'
import { MdDelete } from 'react-icons/md'
import { useMe } from 'hooks/useMe'
import { useModalDispatch } from 'contexts/providers/modal'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { isPendingRequest } from 'utils/isPendingRequest'
interface OwnedEditionItemProps {
  ownedTrack: TrackWithListingItem
}

export const OwnedEditionItem = (props: OwnedEditionItemProps) => {
  const { id, nftData, listingItem: isListed, trackEdition } = props.ownedTrack

  const me = useMe()
  const { dispatchShowAuthorActionsModal } = useModalDispatch()
  const { isOwner } = useTokenOwner(nftData?.tokenId, nftData?.contract)

  const isProcessing =
    isPendingRequest(nftData?.pendingRequest) || isPendingRequest(trackEdition?.editionData?.pendingRequest)

  return (
    <>
      <div className="my-2 flex items-center justify-center gap-10">
        {isProcessing && (
          <ProcessingContainer>
            <ReactTooltip id="processingEdition" type="dark" effect="solid">
              <span>Your NFT is being processed. This can take several minutes.</span>
            </ReactTooltip>
            <BsQuestionCircleFill data-tip data-for="processingEdition" size={18} />
            <span>
              <SpinAnimation />
            </span>
          </ProcessingContainer>
        )}

        {isListed && !isProcessing && (
          <DisabledAnchor>
            <BsTagFill size={22} className="mb-2" />
            <ButtonTitle>List</ButtonTitle>
          </DisabledAnchor>
        )}

        {!isListed && isOwner && !isProcessing && (
          <Link href={`/tracks/${id}/list/buy-now`}>
            <Anchor>
              <BsTagFill size={22} className="mb-2" />
              <ButtonTitle>List</ButtonTitle>
            </Anchor>
          </Link>
        )}

        {(isOwner || me?.roles.includes(Role.Admin)) && (
          <DeleteButton onClick={() => dispatchShowAuthorActionsModal(true, AuthorActionsType.EDITION, id, true)}>
            <MdDelete size={22} className="mb-2" />
            <ButtonTitle>Delete</ButtonTitle>
          </DeleteButton>
        )}
      </div>
    </>
  )
}

const ProcessingContainer = tw.div`
  flex
  flex-col
  items-center 
  justify-center 
  gap-4
  text-neutral-400
`
const ButtonTitle = tw.span`
  text-sm 
  font-medium 
  leading-6 
  tracking-wide
`
const Anchor = tw.a`
  flex 
  flex-col 
  items-center 
  justify-center
  text-neutral-400
  
  hover:cursor-pointer
  hover:text-white
`

const DisabledAnchor = tw.div`
  flex 
  flex-col 
  items-center 
  justify-center
  text-neutral-400
`
const DeleteButton = tw.button`
  flex 
  flex-col 
  items-center 
  justify-center
  text-neutral-400

  hover:cursor-pointer
  hover:text-white
`
