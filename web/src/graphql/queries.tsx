import { gql } from '@apollo/client';

export const GET_MIME_TYPE = gql`
  query MimeType($url: String!) {
    mimeType(url: $url) {
      value
    }
  }
`;
