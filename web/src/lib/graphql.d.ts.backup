declare module 'lib/graphql' {
  import { QueryHookOptions } from '@apollo/client';
  export interface MimeTypeQueryVariables {
    url: string;
  }
  export interface MimeTypeQuery {
    __typename?: 'Query';
    mimeType: { __typename?: 'MimeType'; value: string };
  }
  export function useMimeTypeQuery(baseOptions: QueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables>): any;
}
