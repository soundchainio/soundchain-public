import { LockedLayout } from 'components/LockedLayout';
import { Title } from 'components/Title';
import { ProfileForm } from '../components/ProfileForm';
import { cacheFor } from '../lib/apollo';
import { useMyProfileQuery } from '../lib/graphql';
import { protectPage } from '../lib/protectPage';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(CompleteProfilePage, {}, context, apolloClient);
});

export default function CompleteProfilePage() {
  const { data } = useMyProfileQuery();
  const { facebook, instagram, soundcloud, twitter } = data?.myProfile.socialMedias ?? {};

  const profileFormValues = {
    facebook: facebook || '',
    instagram: instagram || '',
    soundcloud: soundcloud || '',
    twitter: twitter || '',
  };

  return (
    <LockedLayout>
      <Title className="text-center">Profile Information</Title>
      <ProfileForm {...profileFormValues} />
    </LockedLayout>
  );
}
