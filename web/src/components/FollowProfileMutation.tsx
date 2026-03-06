import { gql } from '@apollo/client';

export const FOLLOW_PROFILE = gql`
  mutation FollowProfile($input: FollowProfileInput!) {
    followProfile(input: $input) {
      followedProfile {
        id
        userHandle
        isFollowed
        followerCount
      }
    }
  }
`;
