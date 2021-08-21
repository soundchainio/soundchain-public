import { LockedLayout } from 'components/LockedLayout';
import { Title } from 'components/Title';
import { ProfileForm, ProfileFormProps } from '../components/ProfileForm';
import { apolloClient, propsWithCache } from '../lib/apollo';
import { MyProfileDocument, MyProfileQuery } from '../lib/graphql';
import { protectPage } from '../lib/protectPage';

export const getServerSideProps = protectPage<CompleteProfileProps>(async context => {
  const {
    data: { myProfile },
  } = await apolloClient.query<MyProfileQuery>({ query: MyProfileDocument, context });
  const { facebook, instagram, soundcloud, twitter } = myProfile.socialMedias;
  const profileFormValues = {
    facebook: facebook || '',
    instagram: instagram || '',
    soundcloud: soundcloud || '',
    twitter: twitter || '',
  };

  return {
    props: propsWithCache({ profileFormValues }),
  };
});

export interface CompleteProfileProps {
  profileFormValues: ProfileFormProps;
}

export default function CompleteProfilePage({ profileFormValues }: CompleteProfileProps) {
  return (
    <LockedLayout>
      <Title className="text-center">Profile Information</Title>
      <ProfileForm {...profileFormValues} />
    </LockedLayout>
  );
}
