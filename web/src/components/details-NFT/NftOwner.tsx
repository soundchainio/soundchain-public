import { ProfileWithAvatar } from 'components/ProfileWithAvatar';
import { Profile, useUserByWalletLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';

interface NftOwnerProps {
  owner: string;
  className?: string;
}

export const NftOwner = ({ owner, className }: NftOwnerProps) => {
  const [userByWallet, { data: ownerProfile }] = useUserByWalletLazyQuery();

  useEffect(() => {
    if (owner) {
      userByWallet({ variables: { walletAddress: owner } });
    }
  }, [owner, userByWallet]);

  return (
    <ProfileWithAvatar profile={ownerProfile?.getUserByWallet?.profile as Partial<Profile>} className={className} />
  );
};
