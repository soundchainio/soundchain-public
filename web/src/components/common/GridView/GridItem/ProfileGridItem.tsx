import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton'
import { Profile } from 'lib/graphql'
import Link from 'next/link'
import ReactTooltip from 'react-tooltip'
import { limitTextToNumberOfCharacters } from 'utils/format'

import { Avatar } from '../../../Avatar'
import { DisplayName } from '../../../DisplayName'
import { FollowButton } from '../../../FollowButton'
import { MessageButton } from '../../../MessageButton'
import { SubscribeButton } from '../../../SubscribeButton'

interface ProfileListItemProps {
  profile: Profile
}

export const ProfileGridItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />

  return (
    <div className="rounded-lg bg-transparent p-0.5 hover:bg-rainbow-gradient">
      <div className="h-full w-full max-w-[300px] rounded-lg rounded-b-md bg-black">
        <div
          className="h-[100px] w-full rounded-t-md bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${profile.coverPicture})` }}
        />
        <div className="mx-2 mt-6 flex items-center justify-between">
          <div className="mt-[-90px]">
            <Link href={`/profiles/${profile.userHandle}`} passHref>
              <Avatar
                linkToProfile={false}
                profile={profile}
                pixels={76}
                className="h-[55px] w-[55px] flex-shrink-0 rounded-full border-2 border-gray-10"
              />
            </Link>
          </div>
          <div className="flex items-center">
            <span className="mr-4 flex flex-col items-center">
              <span className="xl:text-md text-sm font-bold text-white">{profile.followerCount || 0}</span>
              <span className="xl:text-md text-sm font-semibold text-gray-80">Followers</span>
            </span>
            <span className="mr-4 flex flex-col items-center">
              <span className="xl:text-md text-sm font-bold text-white">{profile.followingCount || 0}</span>
              <span className="xl:text-md text-sm font-semibold text-gray-80">Following</span>
            </span>
            {profile.isSubscriber ? (
              <>
                <ReactTooltip id="unsubscribeButton" type="dark" effect="solid">
                  <span>Unsubscribe</span>
                </ReactTooltip>
                <a data-tip data-for="unsubscribeButton" className="mt-2 mr-2">
                  <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                </a>
              </>
            ) : (
              <>
                <ReactTooltip id="subscribeButton" type="dark" effect="solid">
                  <span>Subscribe</span>
                </ReactTooltip>
                <a data-tip data-for="subscribeButton" className="mt-2 mr-2">
                  <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                </a>
              </>
            )}
          </div>
        </div>
        <div className="mx-4 mt-8 mb-2 flex items-start justify-between">
          <span className="flex flex-col items-start">
            <Link href={`/profiles/${profile.userHandle}`} passHref>
              <DisplayName
                name={profile.displayName}
                verified={profile.verified}
                teamMember={profile.teamMember}
                className="text-md lg:text-base"
                maxNumberOfCharacters={50}
                badges={profile.badges}
              />
            </Link>
            <p className="text-sm font-semibold text-gray-80 lg:text-sm">{`@${limitTextToNumberOfCharacters(
              profile.userHandle,
              50,
            )}`}</p>
          </span>
          <div className="flex flex-col items-center">
            <span className="mb-2">
              <MessageButton profileId={profile.id} />
            </span>
            <FollowButton
              followedId={profile.id}
              isFollowed={profile.isFollowed}
              followedHandle={profile.userHandle}
              showIcon
            />
          </div>
        </div>
        <p className="text-wrap text-md max-h- mx-4 max-w-[245px] break-words pt-8 pb-6 text-justify text-gray-80">
          {profile.bio ? (
            limitTextToNumberOfCharacters(profile.bio, 500)
          ) : (
            <>
              <br />
              <br />
            </>
          )}
        </p>
      </div>
    </div>
  )
}
