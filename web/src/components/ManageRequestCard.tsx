import { Avatar } from 'components/Avatar';
import { ManageRequestCardSkeleton } from 'components/ManageRequestCardSkeleton';
import { CircleRightArrow } from 'icons/CircleRightArrow';
import { ProfileVerificationRequestComponentFieldsFragment, useProfileQuery } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';

interface ManageRequestCardProps {
  request: ProfileVerificationRequestComponentFieldsFragment;
}

export const ManageRequestCard = ({ request }: ManageRequestCardProps) => {
  const { data: profile } = useProfileQuery({ variables: { id: request.profileId } });

  if (!request) return <ManageRequestCardSkeleton />;
  if (!request || !profile) return null;

  return (
    <div className="flex flex-col text-white odd:bg-gray-20 even:bg-gray-25">
      <NextLink href={`/manage-requests/${request.id}`}>
        <a className="p-4">
          <div className="flex flex-row gap-2 items-center text-sm">
            <Avatar pixels={30} className="flex" profile={profile.profile} />
            <div className="flex flex-col min-w-0">
              <DisplayName
                name={profile.profile.displayName}
                verified={profile.profile.verified}
                teamMember={profile.profile.teamMember}
              />
              <p className="text-gray-80 text-xs">@{profile.profile.userHandle}</p>
            </div>
            <div className="ml-auto">
              <CircleRightArrow />
            </div>
          </div>
        </a>
      </NextLink>
    </div>
  );
};
