/* eslint-disable @next/next/link-passhref */
import { SpinAnimation } from 'components/common/SpinAnimation'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { Role, TrackWithListingItem } from 'lib/graphql'
import Link from 'next/link'
import { BsQuestionCircleFill, BsTagFill } from 'react-icons/bs'
import { MdDelete } from 'react-icons/md'
import { Tooltip } from 'react-tooltip'
import tw from 'tailwind-styled-components'
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
      <div className="my-2 flex items-center justify-center gap-4">
        {isProcessing && (
          <ProcessingContainer>
            <Tooltip id="processingEdition" content="Your NFT is being processed. This can take several minutes." />
            <BsQuestionCircleFill data-tooltip-id="processingEdition" size={18} />
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
          <DeleteButton onClick={() => dispatchShowAuthorActionsModal({ showAuthorActions: true, authorActionsType: AuthorActionsType.EDITION, authorActionsId: id, showOnlyDeleteOption: true })}>
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
const Anchor = tw.span`
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
