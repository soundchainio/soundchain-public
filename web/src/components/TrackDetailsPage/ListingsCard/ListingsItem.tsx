/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/link-passhref */
import { Button } from 'components/Buttons/Button'
import { SpinAnimation } from 'components/common/SpinAnimation'
import { Cell } from 'components/common/Table'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { Profile, useProfileLazyQuery } from 'lib/graphql'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { FaEdit } from 'react-icons/fa'
import { Logo as OgunIcon } from 'icons/Logo'
import tw from 'tailwind-styled-components'
import { isPendingRequest } from 'utils/isPendingRequest'
import { DisplayName } from 'components/DisplayName'
import Link from 'next/link'
import { fixedDecimals } from 'utils/format'
interface ListingItemProps {
  listedTrack: any
  isMobile: boolean
}

export const ListingItem = (props: ListingItemProps) => {
  const router = useRouter()
  const { listedTrack, isMobile } = props

  const price = listedTrack.listingItem?.pricePerItemToShow || 0
  const priceOGUN = listedTrack.listingItem?.OGUNPricePerItemToShow || 0
  const isPaymentOGUN = Boolean(listedTrack.listingItem?.OGUNPricePerItemToShow !== 0) || false
  const profileId = listedTrack.profileId || ''
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
      <Cell>
        <Flex>#{tokenId}</Flex>
      </Cell>

      {isMobile ? (
        <Cell>
          <div className="flex items-center gap-2">
            <div className=" flex items-center gap-1">
              <OgunIcon id="ogun-token" className="mr-[2px] inline h-6 w-6" />
              <div className="flex flex-col items-start">
                <Link href={`/profiles/${profileData?.profile.userHandle}`}>
                  <a>
                    <DisplayName
                      className="text-sm"
                      name={profileData?.profile.displayName || ''}
                      verified={profileData?.profile.verified}
                      teamMember={profileData?.profile.teamMember}
                      badges={profileData?.profile.badges}
                    />
                  </a>
                </Link>
                <div className="flex items-center gap-1">
                  <span className="mt-[1px]">{fixedDecimals(priceOGUN)}</span>
                  <span className="mt-[1px] text-xs font-semibold text-gray-80">OGUN</span>
                </div>
              </div>
            </div>
          </div>
        </Cell>
      ) : (
        <Cell>
          <Flex>
            {!isPaymentOGUN && <Matic value={price} variant="listing-inline" />}
            {isPaymentOGUN && <Ogun value={priceOGUN} />}
          </Flex>
        </Cell>
      )}

      {profileData && !isMobile && (
        <Cell>
          <Flex>
            <ProfileWithAvatar profile={profileData.profile as Partial<Profile>} avatarSize={35} showAvatar={true} />
          </Flex>
        </Cell>
      )}

      {isOwner ? (
        <Cell>
          {isProcessing ? (
            <SpinAnimation />
          ) : (
            <NextLink
              href={{
                pathname: `${router.pathname}/edit/buy-now`,
                query: { ...router.query, isPaymentOGUN },
              }}
            >
              <Anchor>
                <FaEdit size={22} className="mb-[4px] ml-[4px]" />
                <ButtonTitle>Edit</ButtonTitle>
              </Anchor>
            </NextLink>
          )}
        </Cell>
      ) : (
        <Cell>
          {isProcessing ? (
            <SpinAnimation />
          ) : (
            <NextLink
              href={{
                pathname: `${router.pathname}/buy-now`,
                query: { ...router.query, isPaymentOGUN },
              }}
            >
              <a>
                <Button variant="list-nft" className="p-[5px]">
                  <ButtonTitle>BUY</ButtonTitle>
                </Button>
              </a>
            </NextLink>
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
