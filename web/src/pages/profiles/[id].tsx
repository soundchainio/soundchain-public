import { useApolloClient } from '@apollo/client';
import { Avatar } from 'components/Avatar';
import { FollowButton } from 'components/FollowButton';
import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import { ProfileTabs } from 'components/ProfileTabs';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { Subtitle } from 'components/Subtitle';
import { apolloClient } from 'lib/apollo';
import { ProfileDocument, useProfileQuery } from 'lib/graphql';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Image from 'next/image';
import { useEffect } from 'react';

export const getServerSideProps: GetServerSideProps = async context => {
  const {
    data: { profile },
    error,
  } = await apolloClient.query({
    query: ProfileDocument,
    variables: { id: context.params?.id },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return {
    props: { profile },
  };
};

export default function ProfilePage({ profile }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const apollo = useApolloClient();
  const { data } = useProfileQuery({ variables: { id: profile.id }, fetchPolicy: 'cache-only' });

  useEffect(() => {
    apollo.writeQuery({
      query: ProfileDocument,
      variables: { id: profile.id },
      data: {
        profile,
      },
    });
  }, []);

  const {
    coverPicture,
    profilePicture,
    displayName,
    userHandle,
    socialMedias,
    followerCount,
    followingCount,
    isFollowed,
  } = data?.profile ?? profile;

  return (
    <Layout>
      <div className="h-[125px] relative">
        {coverPicture && <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />}
        <Avatar
          src={profilePicture}
          pixels={80}
          className="absolute left-4 bottom-0 transform translate-y-2/3 border-gray-10 border-4 rounded-full"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-end space-x-8">
          <div className="flex space-x-2">
            <div className="text-center text-sm">
              <p className="font-semibold text-white">{followerCount}</p>
              <p className="text-gray-80 text-xs">Followers</p>
            </div>
            <div className="text-center text-sm">
              <p className="font-semibold text-white">{followingCount}</p>
              <p className="text-gray-80 text-xs">Following</p>
            </div>
          </div>
          <FollowButton followedId={profile.id} isFollowed={isFollowed} />
        </div>
        <Subtitle className="mt-4">{displayName}</Subtitle>
        <p className="text-gray-80 text-sm">@{userHandle}</p>
        <div className="flex space-x-4 mt-2">
          {socialMedias.instagram && <SocialMediaLink company="instagram" handle={socialMedias.instagram} />}
          {socialMedias.twitter && <SocialMediaLink company="twitter" handle={socialMedias.twitter} />}
        </div>
      </div>
      <ProfileTabs />
      <Posts variables={{ profileId: profile.id }} />
    </Layout>
  );
}
