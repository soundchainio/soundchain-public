import { gql } from '@apollo/client';

export const EXPLORE_USERS = gql`
  query ExploreUsers($search: String, $page: PageInput) {
    exploreUsers(search: $search, page: $page) {
      nodes {
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
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
