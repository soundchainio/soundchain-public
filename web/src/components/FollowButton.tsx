import { ApolloCache, FetchResult } from '@apollo/client';
import { Button } from 'components/Button';
import { useMe } from 'hooks/useMe';
import { Checkmark } from 'icons/Checkmark';
import {
  ProfileByHandleDocument,
  ProfileByHandleQuery,
  ProfileByHandleQueryVariables,
  useFollowProfileMutation,
  User,
  useUnfollowProfileMutation,
} from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';

interface FollowButtonProps {
  followedId: string;
  isFollowed: boolean;
  showIcon?: boolean;
  followedHandle: string;
}

function updateCache(variables: ProfileByHandleQueryVariables) {
  return (cache: ApolloCache<User>, { data }: FetchResult) => {
    const cachedData = cache.readQuery<ProfileByHandleQuery>({
      query: ProfileByHandleDocument,
      variables,
    });

    const incoming = data?.followProfile?.followedProfile || data?.unfollowProfile?.unfollowedProfile;

    cache.writeQuery({
      query: ProfileByHandleDocument,
      variables,
      data: {
        profileByHandle: {
          ...cachedData?.profileByHandle,
          isFollowed: incoming?.isFollowed || cachedData?.profileByHandle.isFollowed,
          followerCount: incoming?.followerCount || cachedData?.profileByHandle.followerCount,
        },
      },
    });
  };
}

export const FollowButton = ({ followedId, isFollowed, showIcon, followedHandle }: FollowButtonProps) => {
  const me = useMe();
  const router = useRouter();
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation();
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation();

  const handleClick = async () => {
    if (followLoading || unfollowLoading) {
      return;
    }

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } });
      return;
    }

    const toogle = isFollowed ? unfollowProfile : followProfile;

    await toogle({
      variables: { input: { followedId } },
      update: updateCache({ handle: followedHandle }),
    });

    router.replace(router.asPath);
  };

  if (me?.profile.id === followedId) {
    return null;
  }

  const icon = showIcon ? () => <Checkmark color={!isFollowed ? 'green' : undefined} /> : null;

  return (
    <Button
      onClick={handleClick}
      variant="outline-rounded"
      borderColor="bg-green-gradient"
      bgColor={isFollowed ? 'bg-green-gradient' : undefined}
      className="w-[85px] py-1 bg-gray-10 text-sm"
      textColor={isFollowed ? 'text-white' : 'green-gradient-text'}
      icon={icon}
    >
      {isFollowed ? 'Following' : 'Follow'}
    </Button>
  );
};
