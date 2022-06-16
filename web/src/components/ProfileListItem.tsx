import { Avatar } from 'components/Avatar';
import { ProfileListItemSkeleton } from 'components/ProfileListItemSkeleton';
import { Profile } from 'lib/graphql';
import NextLink from 'next/link';
import { DisplayName } from './DisplayName';
import { BellIcon, CheckCircleIcon, MailIcon } from '@heroicons/react/solid';
import { twd } from './utils/twd';
import {SubscribeButton} from "./SubscribeButton";
import {MessageButton} from "./MessageButton";
import {FollowButton} from "./FollowButton";

interface ProfileListItemProps {
  profile: Profile;
}

const BlueGradient = twd(`text-transparent bg-clip-text bg-gradient-to-r 
from-[#3B5BB1] to-[#6FA1FF] font-semibold group-hover:text-white bg-transparent`);

const BlueGradientText = BlueGradient.span;

export const ProfileListItem = ({ profile }: ProfileListItemProps) => {
  if (!profile) return <ProfileListItemSkeleton />;

  return (
    <div className='relative px-1'>
      <div className='relative flex items-center bg-black rounded-lg gap-3 md:mx-4'>
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
                        className='text-[11px] max-w-[300px]'
                      />
                      <p className='text-gray-80 text-[10px] font-semibold'>{`@${profile.userHandle}`}</p>
                    </div>
                    <div>
                      <SubscribeButton profileId={profile.id} isSubscriber={profile.isSubscriber} />
                    </div>

                    {/*<button className={`bg-gradient-to-r from-[#7A278E] to-[#AC6AFF]
              text-white rounded-full w-8 h-8 inline-flex items-center justify-center`}>
                      <BellIcon className='w-4 h-4' />
                    </button>*/}
                  </div>

                  <div className='relative mt-3'>
                    <div className='flex items-center justify-center gap-2 md:gap-3'>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-[10px] md:text-md font-bold'>
                          {profile.followerCount || 0}
                        </span>
                        <span className='text-gray-80 text-[10px] md:text-sm font-semibold'>Followers</span>
                      </div>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-[10px] md:text-md font-bold'>
                          {profile.followingCount || 0}
                        </span>
                        <span className='text-gray-80 text-[10px] md:text-sm font-semibold'>Following</span>
                      </div>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-[10px] md:text-md font-bold'>48</span>
                        <span className='text-gray-80 text-[10px] md:text-sm font-semibold'>Posts</span>
                      </div>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='text-white text-[10px] md:text-md font-bold'>12</span>
                        <span className='text-gray-80 text-[10px] md:text-sm font-semibold'>Tracks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </NextLink>
            <div className='bg-black rounded-r-lg flex flex-col py-4 gap-6 md:px-3 relative items-end -ml-2 md:ml-0'>
              <div className='flex-1' />

              <div className='flex flex-col md:flex-row md:gap-3'>
                <div className='scale-95 md:scale-100'>
                  <FollowButton
                      followedId={profile.id}
                      isFollowed={profile.isFollowed}
                      followedHandle={profile.userHandle}
                  />
                </div>

                <div className='scale-95 md:scale-100'>
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
