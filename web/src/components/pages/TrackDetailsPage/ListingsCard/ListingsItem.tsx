import { useEffect } from 'react'

import { ListNFTButton } from 'components/common/Buttons/ListNFT'
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/link-passhref */
import { SpinAnimation } from 'components/common/SpinAnimation'
import { Cell } from 'components/common/Table'
import { DisplayName } from 'components/DisplayName'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { Logo as OgunIcon } from 'icons/Logo'
import { Matic as MaticIcon } from 'icons/Matic'
import { Profile, useProfileLazyQuery } from 'lib/graphql'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaEdit } from 'react-icons/fa'
import { Tooltip } from 'react-tooltip'
import tw from 'tailwind-styled-components'
import { fixedDecimals } from 'utils/format'
import { isPendingRequest } from 'utils/isPendingRequest'

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
              {isPaymentOGUN && <OgunIcon id="ogun-token" className="mr-[3px] inline h-6 w-6" />}
              {!isPaymentOGUN && <MaticIcon className="mr-[3px] inline h-6 w-6" />}

              <div className="flex flex-col items-start gap-1">
                <Link href={`/profiles/${profileData?.profile.userHandle}`}>
                  <DisplayName
                    className="text-sm"
                    name={profileData?.profile.displayName || ''}
                    verified={profileData?.profile.verified}
                    teamMember={profileData?.profile.teamMember}
                    badges={profileData?.profile.badges}
                  />
                </Link>

                {isPaymentOGUN && (
                  <>
                    <Tooltip id="ogun-price" />
                    <a data-tooltip-id="ogun-price" data-tooltip-content={`${fixedDecimals(priceOGUN)} OGUN`} className="h-[20px]">
                      <div className="flex items-center gap-1">
                        <span className="mt-[1px] max-w-[45px] truncate">{fixedDecimals(priceOGUN)}</span>
                        <span className="mt-[1px] text-xs font-semibold text-gray-80"> OGUN</span>
                      </div>
                    </a>
                  </>
                )}

                {!isPaymentOGUN && (
                  <>
                    <Tooltip id="matic-price" />
                    <a data-tooltip-id="matic-price" data-tooltip-content={`${fixedDecimals(price)} MATIC`} className="h-[20px]">
                      <div className="flex items-center gap-1">
                        <span className="mt-[1px] max-w-[45px] truncate">{fixedDecimals(price)}</span>
                        <span className="mt-[1px] text-xs font-semibold text-gray-80 ">MATIC</span>
                      </div>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </Cell>
      ) : (
        <Cell>
          <Flex>
            {!isPaymentOGUN && (
              <>
                <Tooltip id="matic-price-desktop" />
                <a data-tooltip-id="matic-price-desktop" data-tooltip-content={`${fixedDecimals(price)} MATIC`}>
                  <Matic value={price} variant="listing-inline" truncate="max-w-[70px] truncate" />
                </a>
              </>
            )}
            {isPaymentOGUN && (
              <>
                <Tooltip id="ogun-price-desktop" />
                <a data-tooltip-id="ogun-price-desktop" data-tooltip-content={`${fixedDecimals(priceOGUN)} OGUN`}>
                  <Ogun value={priceOGUN} truncate="max-w-[70px] truncate" />
                </a>
              </>
            )}
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
            <Link
              href={{
                pathname: `${router.pathname}/edit/buy-now`,
                query: { ...router.query, isPaymentOGUN },
              }}
            >
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
            <Link
              href={{
                pathname: `${router.pathname}/buy-now`,
                query: { ...router.query, isPaymentOGUN },
              }}
              passHref
            >
              <ListNFTButton className="py-2 px-4">
                <ButtonTitle>BUY</ButtonTitle>
              </ListNFTButton>
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
