/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/link-passhref */
import { SpinAnimation } from 'components/common/SpinAnimation'
import { Cell } from 'components/common/Table'
import { Matic } from 'components/Matic'
import { Ogun } from 'components/Ogun'
import { ProfileWithAvatar } from 'components/ProfileWithAvatar'
import { useTokenOwner } from 'hooks/useTokenOwner'
import { Profile, useProfileLazyQuery } from 'lib/graphql'
import { Matic as MaticIcon } from 'icons/Matic'
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
import { ListNFTButton } from 'components/common/Buttons/ListNFT'
import ReactTooltip from 'react-tooltip'

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

                {isPaymentOGUN && (
                  <>
                    <ReactTooltip id="ogun-price" type="dark" effect="solid">
                      <span>{fixedDecimals(priceOGUN)} OGUN</span>
                    </ReactTooltip>

                    <a data-tip data-for="ogun-price" className="h-[20px]">
                      <div className="flex items-center gap-1">
                        <span className="mt-[1px] max-w-[45px] truncate">{fixedDecimals(priceOGUN)}</span>

                        <span className="mt-[1px] text-xs font-semibold text-gray-80"> OGUN</span>
                      </div>
                    </a>
                  </>
                )}

                {!isPaymentOGUN && (
                  <>
                    <ReactTooltip id="matic-price" type="dark" effect="solid">
                      <div>
                        <span>{fixedDecimals(price)}</span>
                        <span className="mt-[1px] text-xs font-semibold text-white "> MATIC</span>
                      </div>
                    </ReactTooltip>
                    <a data-tip data-for="matic-price" className="h-[20px]">
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
                <ReactTooltip id="matic-price-desktop" type="dark" effect="solid">
                  <div>
                    <span>{fixedDecimals(price)}</span>
                    <span className="mt-[1px] text-xs font-semibold text-white "> MATIC</span>
                  </div>
                </ReactTooltip>
                <a data-tip="tooltip" data-for="matic-price-desktop">
                  <Matic value={price} variant="listing-inline" truncate="max-w-[70px] truncate" />
                </a>
              </>
            )}
            {isPaymentOGUN && (
              <>
                <ReactTooltip id="ogun-price-desktop" type="dark" effect="solid">
                  <div>
                    <span>{fixedDecimals(priceOGUN)}</span>
                    <span className="mt-[1px] text-xs font-semibold text-white "> OGUN</span>
                  </div>
                </ReactTooltip>
                <a data-tip="tooltip" data-for="ogun-price-desktop">
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
                <ListNFTButton className="py-2 px-4">
                  <ButtonTitle>BUY</ButtonTitle>
                </ListNFTButton>
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
