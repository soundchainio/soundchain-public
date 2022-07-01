import { Avatar } from 'components/Avatar';
import { InboxButton } from 'components/Buttons/InboxButton';
import { DisplayName } from 'components/DisplayName';
import { FollowButton } from 'components/FollowButton';
import { FollowModal } from 'components/FollowersModal';
import { MessageButton } from 'components/MessageButton';
import { Number } from 'components/Number';
import { Posts } from 'components/Posts';
import { Tracks } from 'components/profile/Tracks';
import { ProfileCover } from 'components/ProfileCover';
import { ProfileTabs } from 'components/ProfileTabs';
import SEO from 'components/SEO';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { SubscribeButton } from 'components/SubscribeButton';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { ProfileByHandleDocument, ProfileByHandleQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useEffect, useMemo, useState } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { ProfileTab } from 'types/ProfileTabType';
import { WalletAddressButton } from '../../components/WalletAddressButton';

export interface ProfilePageProps {
  profile: ProfileByHandleQuery['profileByHandle'];
}

interface ProfilePageParams extends ParsedUrlQuery {
  handle: string;
}

export const getServerSideProps: GetServerSideProps<ProfilePageProps, ProfilePageParams> = async context => {
  const handle = context.params?.handle;

  if (!handle) {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { data, error } = await apolloClient.query({
    query: ProfileByHandleDocument,
    variables: { handle },
    context,
  });

  if (!data || error) {
    return { notFound: true };
  }

  return cacheFor(ProfilePage, { profile: data.profileByHandle }, context, apolloClient);
};

export default function ProfilePage({ profile }: ProfilePageProps) {
  const router = useRouter();
  const me = useMe();
  const { setTopNavBarProps } = useLayoutContext();

  const [showModal, setShowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>();
  const [selectedTab, setSelectedTab] = useState<ProfileTab>(ProfileTab.POSTS);

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      rightButton: me ? <InboxButton /> : undefined,
    }),
    [me],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps, topNavBarProps]);

  useEffect(() => {
    setShowModal(false);
  }, [router.asPath]);

  const onFollowers = () => {
    setFollowModalType(FollowModalType.FOLLOWERS);
    setShowModal(true);
  };

  const onFollowing = () => {
    setFollowModalType(FollowModalType.FOLLOWING);
    setShowModal(true);
  };

  const onCloseModal = () => {
    setShowModal(false);
  };

  if (!profile) {
    return null;
  }

  const profileId = profile.id;

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
    magicWalletAddress
  } = profile;

  return (
    <>
      <SEO
        title={`${displayName} | SoundChain`}
        description={`${bio != null ? `${bio} - ` : ''}Join SoundChain to connnect with ${displayName}.`}
        canonicalUrl={`/profiles/${userHandle}`}
        image={profilePicture}
      />
      <>
        <div className="relative h-[125px]">
          <ProfileCover coverPicture={coverPicture || ''} className="h-[125px]" />
          <Avatar
            profile={profile}
            pixels={80}
            className="absolute left-4 bottom-0 translate-y-2/3 transform rounded-full border-4 border-gray-10"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="flex flex-1 space-x-2 pl-[86px]">
              <button className="cursor-pointer text-center text-sm" onClick={onFollowers}>
                <p className="font-semibold text-white">
                  <Number value={followerCount} />
                </p>
                <p className="text-xs text-gray-80">Followers</p>
              </button>
              <button className="mr-2 cursor-pointer text-center text-sm" onClick={onFollowing}>
                <p className="font-semibold text-white">
                  <Number value={followingCount} />
                </p>
                <p className="text-xs text-gray-80">Following</p>
              </button>
            </div>
            <div className="flex flex-row space-x-2">
              <SubscribeButton profileId={profileId} isSubscriber={isSubscriber} />
              <FollowButton followedHandle={userHandle} followedId={profileId} isFollowed={isFollowed} showIcon />
            </div>
          </div>
          <div className="mt-4 flex flex-row gap-2">
            <div className="min-w-0">
              <DisplayName name={displayName} verified={verified} teamMember={teamMember} />
              <p className="text-sm text-gray-80">@{userHandle}</p>
              <p className="py-2 text-sm text-gray-80">{bio}</p>
            </div>
            <WalletAddressButton address={magicWalletAddress}/>
            <MessageButton profileId={profileId} />
          </div>

          <div className="mt-2 flex space-x-4">
            {socialMedias.facebook && <SocialMediaLink company="facebook" handle={socialMedias.facebook} />}
            {socialMedias.instagram && <SocialMediaLink company="instagram" handle={socialMedias.instagram} />}
            {socialMedias.twitter && <SocialMediaLink company="twitter" handle={socialMedias.twitter} />}
            {socialMedias.soundcloud && <SocialMediaLink company="soundcloud" handle={socialMedias.soundcloud} />}
          </div>
        </div>
        <ProfileTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        {ProfileTab.POSTS === selectedTab && <Posts profileId={profileId} />}

        {ProfileTab.TRACKS === selectedTab && <Tracks profileId={profileId} />}

        {ProfileTab.PLAYLISTS === selectedTab && <div> Playlists </div>}

        <FollowModal
          show={showModal}
          profileId={profileId}
          modalType={followModalType as FollowModalType}
          onClose={onCloseModal}
        />
      </>
    </>
  );
}
