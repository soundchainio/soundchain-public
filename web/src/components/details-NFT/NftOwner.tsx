import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { Profile, useProfileLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';

interface NftOwnerProps {
  profileId: string;
  className?: string;
}

export const NftOwner = ({ profileId, className }: NftOwnerProps) => {
  const [userProfile, { data: result }] = useProfileLazyQuery();

  useEffect(() => {
    if (profileId) {
      userProfile({ variables: { id: profileId } });
    }
  }, [profileId, userProfile]);

  return (
    <ProfileWithAvatar profile={result?.profile as Partial<Profile>} className={className} />
  );
};
