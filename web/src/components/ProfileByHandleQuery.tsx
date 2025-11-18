import { gql } from '@apollo/client';

export const PROFILE_BY_HANDLE = gql`
  query ProfileByHandle($handle: String!, $page: PageInput) {  // Added $page: PageInput
    profileByHandle(handle: $handle) {
      id
      userHandle
      displayName
      profilePicture
      verified
      teamMember
      badges
      coverPicture
      followerCount
      followingCount
      isSubscriber
      isFollowed
      bio
      followers(page: $page) {
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
      following(page: $page) {
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
  }
`;
