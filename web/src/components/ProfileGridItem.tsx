import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import NextLink from 'next/link';
import { FollowButton } from './FollowButton';
import { SubscribeButton } from './SubscribeButton';
import { MessageButton } from './MessageButton';

interface ProfileListItemProps {
  profile: Profile;
}

export const ProfileGridItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (

    <div className='relative col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3 2xl:col-span-2 w-full h-full'>
      <div className='relative flex flex-col justify-center justify-center w-full h-full bg-black rounded-lg'>
        <div
          className='p-0.5 bg-transparent h-full hover:bg-rainbow-gradient rounded-lg flex-1 flex flex-col items-center justify-center'>
          <div className='flex w-full h-full'>
            <div className='bg-black flex flex-col text-white w-full rounded-lg'>
              <div className='w-full h-[100px] rounded-t-md bg-center bg-no-repeat bg-cover' style={{
                backgroundImage: `url(${profile.coverPicture})`,
              }} />
              <div className='flex justify-around relative'>
                {/** Profile avatar */}
                <div className='w-[59px] invisible' />
                <div className='absolute -top-6 -left-1 md:left-2 scale-75 md:scale-100'>
                  <NextLink href={`/profiles/${profile.userHandle}`}>
                    <a>
                      <Avatar
                        linkToProfile={false}
                        profile={profile}
                        pixels={76}
                        className='rounded-full h-[50px] w-[50px] flex-shrink-0 border-2 border-gray-10'
                      />
                    </a>
                  </NextLink>
                </div>

                {/** Profile statistics */}
                <div className='flex items-center justify-center gap-2 md:gap-3 md:mt-2 scale-75 md:scale-100'>
                  <div className='flex flex-col items-center justify-center'>
              <span className='text-white text-xs xl:text-md font-bold'>
                {profile.followerCount || 0}
              </span>
                    <span className='text-gray-80 text-xs xl:text-md font-semibold'>Followers</span>
                  </div>
                  <div className='flex flex-col items-center justify-center'>
              <span className='text-white text-xs xl:text-md font-bold'>
                {profile.followingCount || 0}
              </span>
                    <span className='text-gray-80 text-xs xl:text-md font-semibold'>Following</span>
                  </div>
                </div>

                <div className='md:px-2 py-2 md:py-4 -ml-4 md:-ml-2'>
                  <div className='scale-95'>
                    <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                  </div>
                </div>
              </div>

              <div className='flex flex-col md:flex-row px-2'>
                <div className='flex flex-col'>
                  <DisplayName
                    name={profile.displayName}
                    verified={profile.verified}
                    teamMember={profile.teamMember}
                    className='text-[11px] lg:text-base max-w-[140px]'
                  />
                  <p className='text-gray-80 text-[10px] lg:text-sm font-semibold'>{`@${profile.userHandle}`}</p>
                </div>

                <div className='flex-1' />

                <div className='flex justify-center md:justify-end gap-2 flex-wrap'>
                  <div className='scale-95'>
                    <MessageButton profileId={profile.id} />
                  </div>
                  <div className='scale-95'>
                    <FollowButton
                      followedId={profile.id}
                      isFollowed={profile.isFollowed}
                      followedHandle={profile.userHandle}
                    />
                  </div>
                </div>
              </div>

              <div className='flex-col px-2 mt-2'>
              <span className='max-w-full text-wrap text-gray-80 text-sm'>
                {profile.bio || 'no bio yet.'}
              </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
