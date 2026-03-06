import { gql } from '@apollo/client';

export const FEED = gql`
  query Feed($page: PageInput) {
    feed(page: $page) {
      nodes {
        id
        post {
          id
          track {
            id
            playbackUrl
            artworkUrl
            title
            artist
            isFavorite
            deleted
          }
          # Add other post fields as needed
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
