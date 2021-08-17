import { Avatar } from 'components/Avatar';
import { Button } from 'components/Button';
import { Layout } from 'components/Layout';
import { ProfileTabs } from 'components/ProfileTabs';
import { SocialMediaLink } from 'components/SocialMediaLink';
import { Subtitle } from 'components/Subtitle';
import { apolloClient } from 'lib/apollo';
import { ProfileDocument, ProfileQuery } from 'lib/graphql';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Image from 'next/image';

export const getServerSideProps: GetServerSideProps = async context => {
  const {
    data: { profile },
    error,
  } = await apolloClient.query<ProfileQuery>({
    query: ProfileDocument,
    variables: { id: context.params?.id },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return {
    props: { profile: profile },
  };
};

export default function ProfilePage({ profile }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { coverPicture, profilePicture, displayName, user, socialMedias, posts } = profile;

  return (
    <Layout>
      <div className="h-[125px] relative">
        {coverPicture && <Image src={coverPicture} alt="Cover pic" layout="fill" objectFit="cover" />}
        <Avatar
          pic={profilePicture}
          pixels={80}
          className="absolute left-4 bottom-0 transform translate-y-2/3 border-gray-10 border-4 rounded-full"
        />
      </div>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-end space-x-8">
          <div className="flex space-x-2">
            <div className="text-center text-sm">
              <p className="font-semibold text-white">3,537</p>
              <p className="text-gray-80 text-xs">Followers</p>
            </div>
            <div className="text-center text-sm">
              <p className="font-semibold text-white">325</p>
              <p className="text-gray-80 text-xs">Following</p>
            </div>
          </div>
          <Button variant="rainbow-rounded" className="w-20 bg-gray-10 text-sm">
            Follow
          </Button>
        </div>
        <Subtitle className="mt-4">{displayName}</Subtitle>
        <p className="text-gray-80 text-sm">@{user.handle}</p>
        <div className="flex space-x-4 mt-2">
          {socialMedias.instagram && <SocialMediaLink company="instagram" handle={socialMedias.instagram} />}
          {socialMedias.twitter && <SocialMediaLink company="twitter" handle={socialMedias.twitter} />}
        </div>
      </div>
      <ProfileTabs />
    </Layout>
  );
}
