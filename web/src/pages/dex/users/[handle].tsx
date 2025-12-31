/**
 * User Profile Page - /dex/users/[handle]
 *
 * Server-side rendered profile page for viewing other users' profiles.
 * Fetches profile by userHandle for SEO and instant loading.
 */

import { Avatar } from 'components/Avatar'
import { DisplayName } from 'components/DisplayName'
import { FollowButton } from 'components/FollowButton'
import { FollowModal } from 'components/FollowersModal'
import { MessageButton } from 'components/MessageButton'
import { Number } from 'components/Number'
import { Posts } from 'components/Post/Posts'
import { Tracks } from 'components/profile/Tracks'
import { ProfileCover } from 'components/ProfileCover'
import { ProfileTabs } from 'components/ProfileTabs'
import SEO from 'components/SEO'
import { SocialMediaLink } from 'components/SocialMediaLink'
import { SubscribeButton } from 'components/SubscribeButton'
import { WalletAddressButton } from 'components/WalletAddressButton'
import { useMe } from 'hooks/useMe'
import { cacheFor, createApolloClient } from 'lib/apollo'
import { ProfileByHandleDocument, ProfileByHandleQuery } from 'lib/graphql'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useEffect, useState } from 'react'
import { FollowModalType } from 'types/FollowModalType'
import { ProfileTab } from 'types/ProfileTabType'

export interface UserProfilePageProps {
  profile: ProfileByHandleQuery['profileByHandle']
}

interface UserProfilePageParams extends ParsedUrlQuery {
  handle: string
}

export const getServerSideProps: GetServerSideProps<UserProfilePageProps, UserProfilePageParams> = async context => {
  const handle = context.params?.handle

  if (!handle) {
    return { notFound: true }
  }

  const apolloClient = createApolloClient(context)

  try {
    const { data, error } = await apolloClient.query({
      query: ProfileByHandleDocument,
      variables: { handle },
      context,
    })

    if (!data?.profileByHandle || error) {
      return { notFound: true }
    }

    return cacheFor(UserProfilePage, { profile: data.profileByHandle }, context, apolloClient)
  } catch (err) {
    console.error('Error fetching profile:', err)
    return { notFound: true }
  }
}

export default function UserProfilePage({ profile }: UserProfilePageProps) {
  const router = useRouter()
  const me = useMe()

  const [showModal, setShowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState<FollowModalType>()
  const [selectedTab, setSelectedTab] = useState<ProfileTab>(ProfileTab.POSTS)

  useEffect(() => {
    setShowModal(false)
  }, [router.asPath])

  const onFollowers = () => {
    setFollowModalType(FollowModalType.FOLLOWERS)
    setShowModal(true)
  }

  const onFollowing = () => {
    setFollowModalType(FollowModalType.FOLLOWING)
    setShowModal(true)
  }

  const onCloseModal = () => {
    setShowModal(false)
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Profile not found</p>
          <Link href="/dex/users" className="text-cyan-400 hover:underline mt-4 block">
            Browse all users
          </Link>
        </div>
      </div>
    )
  }

  const profileId = profile.id

  const {
    coverPicture,
    displayName,
    userHandle,
    socialMedias,
    followerCount,
    followingCount,
    isFollowed,
    bio,
    isSubscriber,
    verified,
    teamMember,
    profilePicture,
    magicWalletAddress,
    badges,
  } = profile

  return (
    <>
      <SEO
        title={`${displayName} | SoundChain`}
        description={`${bio != null ? `${bio} - ` : ''}Join SoundChain to connect with ${displayName}.`}
        canonicalUrl={`/dex/users/${userHandle}`}
        image={profilePicture}
      />
      <div className="min-h-screen bg-gray-900">
        {/* Back to DEX link */}
        <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-2">
          <Link href="/dex/users" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-2">
            <span>&larr;</span> Back to Users
          </Link>
        </div>

        {/* Cover & Avatar */}
        <div className="relative h-[150px] md:h-[200px]">
          <ProfileCover coverPicture={coverPicture || ''} className="h-full" />
          <Avatar
            profile={profile}
            pixels={100}
            className="absolute left-4 bottom-0 translate-y-1/2 transform rounded-full border-4 border-gray-900"
          />
        </div>

        {/* Profile Info */}
        <div className="px-4 pt-14 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DisplayName name={displayName} verified={verified} teamMember={teamMember} badges={badges} />
              <p className="text-sm text-gray-400">@{userHandle}</p>
            </div>
            <div className="flex flex-row gap-2 ml-4">
              <SubscribeButton profileId={profileId} isSubscriber={isSubscriber} />
              <FollowButton followedHandle={userHandle} followedId={profileId} isFollowed={isFollowed} showIcon />
              <MessageButton profileId={profileId} />
            </div>
          </div>

          {/* Bio */}
          {bio && <p className="mt-3 text-gray-300 text-sm">{bio}</p>}

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <button className="cursor-pointer text-center" onClick={onFollowers}>
              <p className="font-semibold text-white">
                <Number value={followerCount} />
              </p>
              <p className="text-xs text-gray-400">Followers</p>
            </button>
            <button className="cursor-pointer text-center" onClick={onFollowing}>
              <p className="font-semibold text-white">
                <Number value={followingCount} />
              </p>
              <p className="text-xs text-gray-400">Following</p>
            </button>
            <WalletAddressButton address={magicWalletAddress} />
          </div>

          {/* Social Links */}
          <div className="mt-4 flex flex-wrap gap-3">
            {socialMedias?.facebook && <SocialMediaLink company="facebook" handle={socialMedias.facebook} />}
            {socialMedias?.instagram && <SocialMediaLink company="instagram" handle={socialMedias.instagram} />}
            {socialMedias?.twitter && <SocialMediaLink company="twitter" handle={socialMedias.twitter} />}
            {socialMedias?.soundcloud && <SocialMediaLink company="soundcloud" handle={socialMedias.soundcloud} />}
            {socialMedias?.linktree && <SocialMediaLink company="linktree" handle={socialMedias.linktree} />}
            {socialMedias?.discord && <SocialMediaLink company="discord" handle={socialMedias.discord} />}
            {socialMedias?.telegram && <SocialMediaLink company="telegram" handle={socialMedias.telegram} />}
            {socialMedias?.spotify && <SocialMediaLink company="spotify" handle={socialMedias.spotify} />}
            {socialMedias?.bandcamp && <SocialMediaLink company="bandcamp" handle={socialMedias.bandcamp} />}
          </div>
        </div>

        {/* Tabs */}
        <ProfileTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

        {/* Tab Content */}
        <div className="px-4 pb-20">
          {ProfileTab.POSTS === selectedTab && <Posts profileId={profileId} />}
          {ProfileTab.TRACKS === selectedTab && <Tracks profileId={profileId} />}
          {ProfileTab.PLAYLISTS === selectedTab && (
            <div className="text-center py-8 text-gray-400">
              Playlists coming soon
            </div>
          )}
        </div>

        {/* Follow Modal */}
        <FollowModal
          show={showModal}
          profileId={profileId}
          modalType={followModalType as FollowModalType}
          onClose={onCloseModal}
        />
      </div>
    </>
  )
}
