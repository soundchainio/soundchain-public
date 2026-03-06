import { gql } from '@apollo/client';

export const following = gql`  // Changed from FOLLOWING to following
  query following($profileId: ID!, $page: PageInput) {
    following(profileId: $profileId, page: $page) {
      nodes {
        id
        followedProfile {
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
