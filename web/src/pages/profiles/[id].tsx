import { Avatar } from 'components/Avatar';
import { FollowButton } from 'components/FollowButton';
import { FollowModal } from 'components/FollowersModal';
import { Layout } from 'components/Layout';
import { MessageButton } from 'components/MessageButton';
import { Number } from 'components/Number';
import { Posts } from 'components/Posts';
import { ProfileCover } from 'components/ProfileCover';
import { ProfileTabs } from 'components/ProfileTabs';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { SubscribeButton } from 'components/SubscribeButton';
import { Subtitle } from 'components/Subtitle';
import { useProfileLazyQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FollowModalType } from 'types/FollowModalType';
import { CoverPictureOptions } from 'utils/DefaultPictures';

export default function ProfilePage() {
  const router = useRouter();
  const profileId = router.query.id as string;

  const [profile, { data }] = useProfileLazyQuery({ variables: { id: profileId }, ssr: false });
  const [showModal, setShowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>();

  useEffect(() => {
    if (profileId) {
      profile();
    }
  }, [profileId]);

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
  } = data.profile;

  return (
    <Layout>
      <div className="h-[125px] relative">
        <ProfileCover coverPicture={coverPicture as CoverPictureOptions} />
        <Avatar
          profile={data.profile}
          pixels={80}
          className="absolute left-4 bottom-0 transform translate-y-2/3 border-gray-10 border-4 rounded-full"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 pl-[86px] flex space-x-2">
            <div className="text-center text-sm cursor-pointer" onClick={onFollowers}>
              <p className="font-semibold text-white">
                <Number value={followerCount} />
              </p>
              <p className="text-gray-80 text-xs">Followers</p>
            </div>
            <div className="text-center text-sm cursor-pointer mr-2" onClick={onFollowing}>
              <p className="font-semibold text-white">
                <Number value={followingCount} />
              </p>
              <p className="text-gray-80 text-xs">Following</p>
            </div>
          </div>
          <div className="flex flex-row space-x-2">
            <SubscribeButton profileId={profileId} isSubscriber={isSubscriber} />
            <FollowButton followedId={profileId} isFollowed={isFollowed} />
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
          {socialMedias.instagram && <SocialMediaLink company="instagram" handle={socialMedias.instagram} />}
          {socialMedias.twitter && <SocialMediaLink company="twitter" handle={socialMedias.twitter} />}
        </div>
      </div>
      <ProfileTabs />
      <Posts profileId={profileId} />
      <FollowModal
        show={showModal}
        profileId={profileId}
        modalType={followModalType as FollowModalType}
        onClose={onCloseModal}
      />
    </Layout>
  );
}
