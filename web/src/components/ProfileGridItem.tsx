import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import { twd } from './utils/twd';
import { Avatar } from './Avatar';
import { BellIcon, CheckCircleIcon, MailIcon } from '@heroicons/react/solid';
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
      <div className='relative flex flex-col justify-center justify-center w-full h-full bg-black rounded-lg'>
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
                <div className='absolute -top-6 -left-1 md:left-2 scale-75 md:scale-100'>
                  <Avatar
                    linkToProfile={false}
                    profile={profile}
                    pixels={76}
                    className='rounded-full h-[50px] w-[50px] flex-shrink-0 border-2 border-gray-10'
                  />
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

                <div className='md:px-2 md:py-4 -ml-4'>
                  <button className={`bg-gradient-to-r from-[#7A278E] to-[#AC6AFF] text-white
                    rounded-full w-6 h-6 inline-flex items-center justify-center ml-2 mt-2`}>
                    <BellIcon className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div className='flex flex-col md:flex-row px-2'>
                <div className='flex flex-col'>
                  <DisplayName
                    name={profile.displayName}
                    verified={profile.verified}
                    teamMember={profile.teamMember}
                    className='text-[11px] max-w-[140px]'
                  />
                  <p className='text-gray-80 text-[10px] font-semibold'>{`@${profile.userHandle}`}</p>
                </div>

                <div className='flex-1' />

                 <div className='flex justify-center md:justify-end'>
                   <button className={`flex -mr-4 scale-75 items-center px-2 py-1 gap-2 text-white text-xs
                rounded-full bg-gradient-to-r from-[#278E31] hover:from-[#1b6423] hover:to-[#408a2e] to-[#52B23B]`}>
                     <CheckCircleIcon className='h-4 w-4' />
                      <span>{profile.isFollowed ? 'Following' : 'Follow'}</span>
                   </button>

                   <div className={`px-0.5 mx-0 scale-75 py-0.5 text-white rounded-full
                     bg-gradient-to-r from-[#3B5BB1] to-[#6FA1FF] group scale-75`}>
                    <button
                      className={`rounded-full py-1 px-2 bg-black flex items-center gap-2 hover:bg-gradient-to-r 
                        from-[#3B5BB1] to-[#6FA1FF]`}>
                      <MailIcon className='h-4 w-4' />
                      <BlueGradientText>Message</BlueGradientText>
                    </button>
                  </div>
                 </div>
              </div>

              <div className='flex-col px-2 mt-2'>
                <span className='max-w-full text-wrap text-gray-80 text-sm'>
                  {profile.bio || 'no bio yet.'}
                </span>
              </div>


            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
