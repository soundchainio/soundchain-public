import { Avatar } from 'components/Avatar';
import { ManageRequestCardSkeleton } from 'components/ManageRequestCardSkeleton';
import { RightArrow } from 'icons/RightArrow';
import { ProfileVerificationRequestComponentFieldsFragment, useProfileQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';

interface ManageRequestCardProps {
  request: ProfileVerificationRequestComponentFieldsFragment
}

export const ManageRequestCard = ({ request }: ManageRequestCardProps) => {
  const { data: profile } = useProfileQuery({ variables: { id: request.profileId } });

  if (!request) return <ManageRequestCardSkeleton />;
  if (!request || !profile) return null;

  return (
    <div className="flex flex-col text-white cursor-pointer">
      <NextLink href={`/manage-requests/${request.id}`}>
        <div className="relative flex items-center bg-gray-20 p-4">
          <Avatar
            profile={profile.profile}
            pixels={40}
            className="rounded-full min-w-max flex items-center"
          />
          <div className="mx-4">
            <DisplayName name={profile.profile.displayName} verified={profile.profile.verified} />
            <p className="text-gray-80 text-sm">@{profile.profile.userHandle}</p>
          </div>
          <div className="flex-1 flex justify-end">
            <RightArrow className="w-5 h-5" />
          </div>
        </div>
      </NextLink>
    </div>
  );
};
