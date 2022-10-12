/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/link-passhref */
import { useTokenOwner } from 'hooks/useTokenOwner'
import tw from 'tailwind-styled-components'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { Cell } from 'components/common/Table'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { Profile, useProfileLazyQuery } from 'lib/graphql'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from 'components/Buttons/Button'
import { FaEdit } from 'react-icons/fa'
import { SpinAnimation } from 'components/common/SpinAnimation'
import { isPendingRequest } from 'utils/isPendingRequest'
interface ListingItemProps {
  listedTrack: any
  isMobile: boolean
}

export const ListingItem = (props: ListingItemProps) => {
  const { listedTrack, isMobile } = props

  const price = listedTrack.listingItem?.pricePerItemToShow || 0
  const priceOGUN = listedTrack.listingItem?.OGUNPricePerItemToShow || 0
  const isPaymentOGUN = Boolean(listedTrack.listingItem?.OGUNPricePerItemToShow !== 0) || false
  const profileId = listedTrack.profileId || ''
  const trackId = listedTrack.id
  const tokenId = listedTrack.nftData?.tokenId || 0
  const contractAddress = listedTrack.nftData?.contract || ''

  const isProcessing =
    isPendingRequest(listedTrack.nftData?.pendingRequest) ||
    isPendingRequest(listedTrack.trackEdition?.editionData?.pendingRequest)

  const { isOwner } = useTokenOwner(tokenId, contractAddress)

  const [userQueryProfile, { data: profileData }] = useProfileLazyQuery()

  useEffect(() => {
    if (!profileId) return

    userQueryProfile({ variables: { id: profileId } })
  }, [profileId, userQueryProfile])

  return (
    <>
      {!isMobile && (
        <Cell>
          <Flex>#{tokenId}</Flex>
        </Cell>
      )}

      <Cell>
        <Flex>
          {!isPaymentOGUN && <Matic value={price} variant="listing-inline" />}
          {isPaymentOGUN && <Ogun value={priceOGUN} />}
        </Flex>
      </Cell>

      {profileData && !isMobile && (
        <Cell>
          <Flex>
            <ProfileWithAvatar profile={profileData.profile as Partial<Profile>} avatarSize={30} showAvatar={true} />
          </Flex>
        </Cell>
      )}

      {isOwner ? (
        <Cell>
          {isProcessing ? (
            <SpinAnimation />
          ) : (
            <Link href={`${trackId}/edit/buy-now`}>
              <Anchor>
                <FaEdit size={22} className="mb-[4px] ml-[4px]" />
                <ButtonTitle>Edit</ButtonTitle>
              </Anchor>
            </Link>
          )}
        </Cell>
      ) : (
        <Cell>
          {isProcessing ? (
            <SpinAnimation />
          ) : (
            <Link href={`${trackId}/buy-now`}>
              <a>
                <Button variant="list-nft">
                  <ButtonTitle>BUY</ButtonTitle>
                </Button>
              </a>
            </Link>
          )}
        </Cell>
      )}
    </>
  )
}

const Flex = tw.div`
  flex
  items-center
  justify-center
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

const ButtonTitle = tw.span`
  text-sm 
  font-medium 
  leading-6 
  tracking-wide
`
