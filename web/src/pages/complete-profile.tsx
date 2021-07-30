import Link from 'next/link';
import { ProfileForm, ProfileFormProps } from '../components/ProfileForm';
import { protectPage } from '../lib/protectPage';
import { apolloClient } from '../lib/apollo';
import { MyProfileDocument, MyProfileQuery } from '../lib/graphql';

export const getServerSideProps = protectPage<CompleteProfileProps>(async context => {
  let profileFormValues: ProfileFormProps = { twitter: '', facebook: '', instagram: '', soundcloud: '' };
  const {
    data: { myProfile },
  } = await apolloClient.query<MyProfileQuery>({ query: MyProfileDocument, context });

  if (myProfile) {
    myProfile.socialMediaHandles.forEach(socialMedia => {
      profileFormValues = { ...profileFormValues, [socialMedia.name.toLowerCase()]: socialMedia.handle };
    });
  }

  return {
    props: { profileFormValues },
  };
});

export interface CompleteProfileProps {
  profileFormValues: ProfileFormProps;
}

export default function CompleteProfilePage({ profileFormValues }: CompleteProfileProps) {
  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6 mb-6">
        <div className="grid grid-cols-1 gap-6">
          <Link href="/" passHref>
            <button className="border-2 p-3">Skip</button>
          </Link>
        </div>
        <h1 className="text-2xl">Profile information</h1>
        <ProfileForm {...profileFormValues} />
      </div>
    </div>
  );
}
