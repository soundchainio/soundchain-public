import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton'
import { Profile } from 'lib/graphql'
import { Avatar } from './Avatar'
import { DisplayName } from './DisplayName'
import NextLink from 'next/link'
import { FollowButton } from './FollowButton'
import { SubscribeButton } from './SubscribeButton'
import { MessageButton } from './MessageButton'

interface ProfileListItemProps {
  profile: Profile
}

export const ProfileGridItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />

  return (
    <div className="relative col-span-12 h-full w-full sm:col-span-6 md:col-span-4 lg:col-span-3 2xl:col-span-2">
      <div className="relative flex h-full w-full flex-col justify-center justify-center rounded-lg bg-black">
        <div className="flex h-full flex-1 flex-col items-center justify-center rounded-lg bg-transparent p-0.5 hover:bg-rainbow-gradient">
          <div className="flex h-full w-full">
            <div className="flex w-full flex-col rounded-lg bg-black text-white">
              <div
                className="h-[100px] w-full rounded-t-md bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${profile.coverPicture})`,
                }}
              />
              <div className="relative flex justify-around">
                {/** Profile avatar */}
                <div className="invisible w-[59px]" />
                <div className="absolute -top-6 -left-1 scale-75 md:left-2 md:scale-100">
                  <NextLink href={`/profiles/${profile.userHandle}`}>
                    <a>
                      <Avatar
                        linkToProfile={false}
                        profile={profile}
                        pixels={76}
                        className="h-[50px] w-[50px] flex-shrink-0 rounded-full border-2 border-gray-10"
                      />
                    </a>
                  </NextLink>
                </div>

                {/** Profile statistics */}
                <div className="flex scale-75 items-center justify-center gap-2 md:mt-2 md:scale-100 md:gap-3">
                  <div className="flex flex-col items-center justify-center">
                    <span className="xl:text-md text-xs font-bold text-white">{profile.followerCount || 0}</span>
                    <span className="xl:text-md text-xs font-semibold text-gray-80">Followers</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="xl:text-md text-xs font-bold text-white">{profile.followingCount || 0}</span>
                    <span className="xl:text-md text-xs font-semibold text-gray-80">Following</span>
                  </div>
                </div>

                <div className="-ml-4 py-2 md:-ml-2 md:px-2 md:py-4">
                  <div className="scale-95">
                    <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col px-2 md:flex-row">
                <div className="flex flex-col">
                  <DisplayName
                    name={profile.displayName}
                    verified={profile.verified}
                    teamMember={profile.teamMember}
                    className="max-w-[140px] text-[11px] lg:text-base"
                  />
                  <p className="text-[10px] font-semibold text-gray-80 lg:text-sm">{`@${profile.userHandle}`}</p>
                </div>

                <div className="flex-1" />

                <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                  <div className="scale-95">
                    <MessageButton profileId={profile.id} />
                  </div>
                  <div className="scale-95">
                    <FollowButton
                      followedId={profile.id}
                      isFollowed={profile.isFollowed}
                      followedHandle={profile.userHandle}
                      showIcon
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex-col px-2">
                <span className="text-wrap max-w-full text-sm text-gray-80">{profile.bio || ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
