import { ManageRequestCardSkeleton } from 'components/ManageRequestCardSkeleton'
import { CircleRightArrow } from 'icons/CircleRightArrow'
import { ProfileVerificationRequestComponentFieldsFragment, useProfileQuery } from 'lib/graphql'
import Link from 'next/link'

import { ProfileWithAvatar } from './ProfileWithAvatar'

interface ManageRequestCardProps {
  request: ProfileVerificationRequestComponentFieldsFragment
}

export const ManageRequestCard = ({ request }: ManageRequestCardProps) => {
  const { data: profile } = useProfileQuery({ variables: { id: request.profileId } })

  if (!request) return <ManageRequestCardSkeleton />
  if (!request || !profile) return null

  return (
    <div className="flex flex-col text-white odd:bg-gray-20 even:bg-gray-25">
      <Link href={`/manage-requests/${request.id}`} className="p-4" passHref>
        <div className="flex flex-row items-center gap-2 text-sm">
          <ProfileWithAvatar profile={profile.profile} />
          <div className="ml-auto">
            <CircleRightArrow />
          </div>
        </div>
      </Link>
    </div>
  )
}
