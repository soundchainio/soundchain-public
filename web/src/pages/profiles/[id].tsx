import { Avatar } from 'components/Avatar';
import { FollowButton } from 'components/FollowButton';
import { Layout } from 'components/Layout';
import { MessageButton } from 'components/MessageButton';
import { Number } from 'components/Number';
import { Posts } from 'components/Posts';
import { ProfileTabs } from 'components/ProfileTabs';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { Subtitle } from 'components/Subtitle';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { ProfileDocument, useProfileQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import Image from 'next/image';
import { ParsedUrlQuery } from 'querystring';

export interface ProfilePageProps {
  profileId: string;
}

interface ProfilePageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps<ProfilePageProps, ProfilePageParams> = async context => {
  const profileId = context.params?.id;

  if (typeof profileId !== 'string') {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { error } = await apolloClient.query({
    query: ProfileDocument,
    variables: { id: profileId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(ProfilePage, { profileId }, context, apolloClient);
};

export default function ProfilePage({ profileId }: ProfilePageProps) {
  const { data } = useProfileQuery({ variables: { id: profileId } });

  if (!data) {
    return null;
  }

  const { coverPicture, displayName, userHandle, socialMedias, followerCount, followingCount, isFollowed } =
    data.profile;

  return (
    <Layout>
      <div className="h-[125px] relative">
        {coverPicture && <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />}
        <Avatar
          profile={data.profile}
          pixels={80}
          className="absolute left-4 bottom-0 transform translate-y-2/3 border-gray-10 border-4 rounded-full"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center space-x-8">
          <div className="flex-1 pl-24 flex space-x-4">
            <div className="text-center text-sm">
              <p className="font-semibold text-white">
                <Number value={followerCount} />
              </p>
              <p className="text-gray-80 text-xs">Followers</p>
            </div>
            <div className="text-center text-sm">
              <p className="font-semibold text-white">
                <Number value={followingCount} />
              </p>
              <p className="text-gray-80 text-xs">Following</p>
            </div>
          </div>
          <FollowButton followedId={profileId} isFollowed={isFollowed} />
        </div>
        <div className="flex flex-row mt-4">
          <div>
            <Subtitle className="">{displayName}</Subtitle>
            <p className="text-gray-80 text-sm">@{userHandle}</p>
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
    </Layout>
  );
}
