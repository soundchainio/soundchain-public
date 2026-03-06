import { gql } from '@apollo/client';

export const followers = gql`  // Changed from FOLLOWERS to followers
  query followers($profileId: ID!, $page: PageInput) {
    followers(profileId: $profileId, page: $page) {
      nodes {
        id
        followerProfile {
          id
          userHandle
          displayName
          profilePicture
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        totalCount
      }
    }
  }
`;
