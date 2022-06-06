import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import { twd } from './utils/twd';
import { Avatar } from './Avatar';
import { BellIcon, CheckCircleIcon, HeartIcon, PlayIcon } from '@heroicons/react/solid';
import { DisplayName } from './DisplayName';

interface ProfileListItemProps {
  profile: Profile;
}

const BlueGradient = twd(`text-transparent bg-clip-text bg-gradient-to-r 
from-[#3B5BB1] to-[#6FA1FF] font-semibold group-hover:text-white bg-transparent`);

const BlueGradientText = BlueGradient.span;

export const ProfileGridItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <div className='relative col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-2 w-full h-full'>
      <div className='relative flex items-center w-full h-full bg-black rounded-lg'>
        <div
          className='p-0.5 bg-transparent h-full hover:bg-rainbow-gradient rounded-lg flex-1 flex flex-col items-center justify-center'>
          <div className='flex w-full h-full'>
            <span className='bg-black flex flex-col text-white w-full rounded-lg'>
              <div className='w-full h-[100px] rounded-t-lg bg-center bg-no-repeat bg-cover' style={{
                backgroundImage: `url(${profile.coverPicture})`,
              }} />
              <div className='flex justify-around relative'>
                {/** Profile avatar */}
                <div className='w-[59px] invisible' />
                <div className='absolute -top-6 left-2'>
                  <Avatar
                    linkToProfile={false}
                    profile={profile}
                    pixels={76}
                    className='rounded-full h-[50px] w-[50px] flex-shrink-0 border-2 border-gray-10'
                  />
                </div>

                {/** Profile statistics */}
                <div className='flex items-center justify-center gap-2 md:gap-3 mt-2'>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-white text-[8px] xl:text-md font-bold'>
                      {profile.followerCount || 0}
                    </span>
                    <span className='text-gray-80 text-[8px] xl:text-md font-semibold'>Followers</span>
                  </div>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-white text-[8px] xl:text-md font-bold'>
                      {profile.followingCount || 0}
                    </span>
                    <span className='text-gray-80 text-[8px] xl:text-md font-semibold'>Following</span>
                  </div>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-white text-[8px] xl:text-md font-bold'>48</span>
                    <span className='text-gray-80 text-[8px] xl:text-md font-semibold'>Posts</span>
                  </div>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-white text-[8px] xl:text-md font-bold'>12</span>
                    <span className='text-gray-80 text-[8px] xl:text-md font-semibold'>Tracks</span>
                  </div>
                </div>

                <div className='px-2'>
                  <button className={`bg-gradient-to-r from-[#7A278E] to-[#AC6AFF] text-white 
                    rounded-full w-6 h-6 inline-flex items-center justify-center ml-2 mt-2`}>
                    <BellIcon className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div className='flex px-2'>
                <div className='flex flex-col'>
                  <DisplayName
                    name={profile.displayName}
                    verified={profile.verified}
                    teamMember={profile.teamMember}
                    className='text-[11px] max-w-[140px]'
                  />
                  <p className='text-gray-80 text-[10px] font-semibold'>{`@${profile.userHandle}`}</p>
                </div>
              </div>

              <div className='flex-col px-2 mt-2'>
                <span className='max-w-full text-wrap text-gray-80 text-sm'>
                  {profile.bio || 'no bio yet.'}
                </span>
              </div>

              <div className='flex justify-end gap-3 text-xs md:text-sm items-center py-2 px-2'>
                <div className='text-gray-80 flex gap-1'>
                  <PlayIcon className='h-4 w-4' />
                  <span>8,395,826</span>
                </div>
                <div className='text-gray-80 flex gap-1'>
                  <HeartIcon className='h-4 w-4' />
                  <span>86,359</span>
                </div>
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
