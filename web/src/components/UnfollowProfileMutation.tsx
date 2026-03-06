import { gql } from '@apollo/client';

export const UNFOLLOW_PROFILE = gql`
  mutation UnfollowProfile($input: UnfollowProfileInput!) {
    unfollowProfile(input: $input) {
      unfollowedProfile {
        id
        userHandle
        isFollowed
        followerCount
      }
    }
  }
`;
