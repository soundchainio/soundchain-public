import { Avatar } from 'components/Avatar';
import { InboxButton } from 'components/Buttons/InboxButton';
import { FollowButton } from 'components/FollowButton';
import { FollowModal } from 'components/FollowersModal';
import { Layout } from 'components/Layout';
import { MessageButton } from 'components/MessageButton';
import { Number } from 'components/Number';
import { Posts } from 'components/Posts';
import { Tracks } from 'components/profile/Tracks';
import { ProfileCover } from 'components/ProfileCover';
import { ProfileTabs } from 'components/ProfileTabs';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { SubscribeButton } from 'components/SubscribeButton';
import { Subtitle } from 'components/Subtitle';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { useProfileByHandleLazyQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { ProfileTab } from 'types/ProfileTabType';

export default function ProfilePage() {
  const router = useRouter();
  const handle = router.query.handle as string;
  const me = useMe();

  const [profile, { data }] = useProfileByHandleLazyQuery({ variables: { handle }, ssr: false });
  const [showModal, setShowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>();
  const [selectedTab, setSelectedTab] = useState<ProfileTab>(ProfileTab.POSTS);

  useEffect(() => {
    if (handle && profile) {
      profile();
    }
  }, [handle, profile]);

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

  if (!data) {
    return null;
  }

  const profileId = data.profileByHandle.id;

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
  } = data.profileByHandle;

  const topNovaBarProps: TopNavBarProps = {
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="h-[125px] relative">
        <ProfileCover coverPicture={coverPicture || ''} className="h-[125px]" />
        <Avatar
          profile={data.profileByHandle}
          pixels={80}
          className="absolute left-4 bottom-0 transform translate-y-2/3 border-gray-10 border-4 rounded-full"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 pl-[86px] flex space-x-2">
            <button className="text-center text-sm cursor-pointer" onClick={onFollowers}>
              <p className="font-semibold text-white">
                <Number value={followerCount} />
              </p>
              <p className="text-gray-80 text-xs">Followers</p>
            </button>
            <button className="text-center text-sm cursor-pointer mr-2" onClick={onFollowing}>
              <p className="font-semibold text-white">
                <Number value={followingCount} />
              </p>
              <p className="text-gray-80 text-xs">Following</p>
            </button>
          </div>
          <div className="flex flex-row space-x-2">
            <SubscribeButton profileId={profileId} isSubscriber={isSubscriber} />
            <FollowButton followedId={handle} isFollowed={isFollowed} />
          </div>
        </div>
        <div className="flex flex-row mt-4">
          <div>
            <Subtitle className="">{displayName}</Subtitle>
            <p className="text-gray-80 text-sm">@{userHandle}</p>
            <p className="text-gray-80 py-2 text-sm">{bio}</p>
          </div>
          <MessageButton profileId={profileId} />
        </div>

        <div className="flex space-x-4 mt-2">
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
    </Layout>
  );
}
