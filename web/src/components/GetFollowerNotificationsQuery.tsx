import { gql } from '@apollo/client';

export const GET_FOLLOWER_NOTIFICATIONS = gql`
  query GetFollowerNotifications($page: PageInput) {
    getFollowerNotifications(page: $page) {
      nodes {
        id
        link
        createdAt
        followerName
        followerPicture
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
