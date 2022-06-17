import { Avatar } from 'components/Avatar';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';
import {SubscribeButton} from "./SubscribeButton";
import {MessageButton} from "./MessageButton";
import {FollowButton} from "./FollowButton";

interface ProfileListItemProps {
  profile: Profile;
}

export const ProfileListItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <div className='relative px-1 py-3'>
      <div className='relative flex items-center bg-black rounded-lg gap-3 md:mx-4 h-[120px] sm:h-[140px]'>
        <div
          className='p-0.5 bg-transparent hover:bg-rainbow-gradient rounded-lg flex-1 flex flex-col items-center justify-center'>
          <div className='flex w-full'>
            <NextLink href={`/profiles/${profile.userHandle}`}>
              <a
                className='relative flex items-center bg-black pl-3 py-4 rounded-l-lg gap-3 justify-start md:justify-around flex-1'>
                <Avatar
                  linkToProfile={false}
                  profile={profile}
                  pixels={76}
                  className='rounded-full h-[59px] md:h-[76px] w-[59px] md:w-[76px] flex-shrink-0 border-2 border-gray-10'
                />
                <div className='min-w-0 md:flex-1 flex flex-col items-start -ml-3 md:ml-4 scale-90 md:scale-100'>
                  <div className='flex gap-2 md:gap-3'>
                    <div className='flex flex-col'>
                      <DisplayName
                        name={profile.displayName}
                        verified={profile.verified}
                        teamMember={profile.teamMember}
                        className='text-md md:text-md lg:text-lg max-w-[300px]'
                      />
                      <p className='text-gray-80 text-sm  md:text-sm font-semibold'>{`@${profile.userHandle}`}</p>
                    </div>
                    <div>
                      <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                    </div>
                  </div>

                  <div className='relative mt-3'>
                    <div className='flex items-center justify-center gap-2 md:gap-3'>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-sm md:text-md lg:text-lg font-bold'>
                          {profile.followerCount || 0}
                        </span>
                        <span className='text-gray-80 text-xs md:text-sm lg:text-md font-semibold'>Followers</span>
                      </div>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-sm md:text-md lg:text-lg font-bold'>
                          {profile.followingCount || 0}
                        </span>
                        <span className='text-gray-80 text-xs md:text-sm lg:text-md font-semibold'>Following</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </NextLink>
            <div className='bg-black rounded-r-lg flex flex-col py-4 gap-6 md:px-3 relative items-end -ml-2 md:ml-0'>
              <div className='flex-1' />

              <div className='flex flex-col md:flex-row md:gap-3 gap-1 pr-3'>
                <div className='scale-95 md:scale-100 w-full flex items-center justify-end'>
                  <FollowButton
                      followedId={profile.id}
                      isFollowed={profile.isFollowed}
                      followedHandle={profile.userHandle}
                      showIcon
                  />
                </div>

                <div className='scale-95 md:scale-100 w-full flex items-center justify-end'>
                  <MessageButton profileId={profile.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
